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
`shape.md`.

- `{project-path}` is the named project's folder under its scope root
  (`.oat/projects/<scope>/<name>`, beside `oat config get projects.root`) when
  the user names a project, even when another project is active;
  otherwise it is the active project's path. A name found in more than one
  scope is ambiguous: ask which. A synced project with no folder here is not
  pulled yet: `oat project list` shows it with the hint
  `oat project pull <name>`. Tell the user to run that command and stop.
- Confirm that `{project-path}/state.md` reports `oat_workflow_mode: freestyle`;
  any other mode is the Another mode case below.
- Make it the active project before reading, shaping or any brainstorm detour:
  `oat-brainstorm` and the records commands act on the active project, so a
  named project that is not active would send their writes elsewhere.

```bash
PROJECT_PATH="{project-path}"
oat config set activeProject "$PROJECT_PATH" || {
  echo "freestyle: could not make $PROJECT_PATH the active project; stopping" >&2
  exit 1
}
# The pointer must now name this project, or brainstorm and the records
# commands would act on the previous one. Compare canonical directories, and
# stop when either does not resolve: two failed lookups are not a match.
ACTIVE_PATH=$(oat config get activeProject 2>/dev/null || true)
ACTIVE_DIR=$(cd "$ACTIVE_PATH" 2>/dev/null && pwd -P)
PROJECT_DIR=$(cd "$PROJECT_PATH" 2>/dev/null && pwd -P)
if [ -z "$ACTIVE_PATH" ] || [ -z "$ACTIVE_DIR" ] || [ -z "$PROJECT_DIR" ] ||
  [ "$ACTIVE_DIR" != "$PROJECT_DIR" ]; then
  echo "freestyle: the active project is '$ACTIVE_PATH', not $PROJECT_PATH; stopping" >&2
  exit 1
fi
```

A failed pointer write, or a pointer that still names another project, stops
the run before Step 2: never read or shape against the previous project.
Continue at Step 2.

**Another mode.** When the named project, or the active project when none is
named, is in another mode and the user did not ask for a new project, say that
this skill only shapes freestyle projects and stop, leaving the active project
unchanged. Promotion to or from freestyle does not exist.

**Create.** Otherwise resolve a project name and a one-line description from
the arguments, asking for whatever is missing. Choose the scope with the user,
recommending the repository default; scope is chosen here, not shaped:

- `shared`: the project folder is committed on the current branch;
  `oat project new` commits the scaffold unless `--no-commit` is passed.
- `local`: the project stays uncommitted in this checkout, on one machine.
- `synced`: the project lives in a nested worktree and is published to
  `refs/oat/projects/<slug>`; it needs an `origin` remote.

```bash
SCAFFOLD=$(oat project new "{project-name}" --mode freestyle --scope "{scope}" --json) || {
  printf '%s\n' "$SCAFFOLD"
  echo "freestyle: oat project new failed; stopping" >&2
  exit 1
}
printf '%s\n' "$SCAFFOLD"
# Use the path the scaffold reports, never a re-read of the pointer: a pointer
# that was not repointed still names the previous project. Decode it as JSON,
# so any character a path may hold survives.
PROJECT_PATH=$(printf '%s' "$SCAFFOLD" | node -e '
let raw = "";
process.stdin.on("data", (chunk) => (raw += chunk)).on("end", () => {
  try {
    const path = JSON.parse(raw).projectPath;
    if (typeof path === "string") process.stdout.write(path);
  } catch {}
});')
if [ -z "$PROJECT_PATH" ] || [ ! -f "$PROJECT_PATH/state.md" ]; then
  echo "freestyle: the scaffold reported no project path with a state.md; stopping" >&2
  exit 1
fi
ACTIVE_PATH=$(oat config get activeProject 2>/dev/null || true)
if [ -z "$ACTIVE_PATH" ] ||
  [ "$(cd "$ACTIVE_PATH" 2>/dev/null && pwd -P)" != "$(cd "$PROJECT_PATH" && pwd -P)" ]; then
  echo "freestyle: the active project is '$ACTIVE_PATH', not $PROJECT_PATH; stopping" >&2
  exit 1
fi
```

A failed scaffold, a report with no usable project path, or a pointer that
still names another project stops the run before any shaping write.

Confirm that `"$PROJECT_PATH/state.md"` reports `oat_workflow_mode: freestyle`
and that `"$PROJECT_PATH/AGENTS.md"` and `"$PROJECT_PATH/shape.md"` exist. A
missing file or another mode stops the run before any write. Keep the
description for the Goal topic; do not write it into `shape.md` until the user
confirms the goal.

### Step 2: Read the Project

Read `"$PROJECT_PATH/AGENTS.md"` first, then `"$PROJECT_PATH/shape.md"`.
Determine:

1. the first topic section, in order, that still reads `_Not yet shaped._`,
   and any `**Shaping resumes at:**` line left by a detour. When
   `## Brainstorm or discovery` still reads `result: pending`, the detour never
   handed back: look for its reference file in the project's `brainstorming/`
   folder and, with the user, either record it (its path and a one-line
   summary, replacing `pending`) or resume the brainstorm before shaping
   continues at the topic the line names;
2. the reshape triggers to check on every resume: the checkpoints under
   `## Reshape checkpoints` that have been reached, the `## Undecided` items
   whose moment has come, and any agreement that stopped working (a reviewer
   unavailable, a rule bypassed repeatedly).

Then choose what to load:

- A topic is not yet shaped → read `references/kickoff.md` and continue at
  Step 3.
- Every topic is shaped, and a resume trigger from item 2 holds or the user
  wants to change how the project runs → read `references/reshape.md` and
  continue at Step 4.
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
  re-asking answered ones, and checks the three reshape triggers from Step 2:
  reached reshape checkpoints, Undecided items that are due, and agreements
  that stopped working.
- ✅ No commit, push or PR is made except as `shape.md` agrees; none while the
  commit agreement is not yet shaped or is deferred.
- ✅ The project `AGENTS.md` is never edited.
