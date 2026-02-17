---
name: oat-project-new
description: Use when starting a full-lifecycle OAT project from scratch. Scaffolds a new project under PROJECTS_ROOT and sets it active.
argument-hint: "<project-name> [--force]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(pnpm:*), Glob, Grep, AskUserQuestion
---

# New OAT Project

Create a new OAT project directory, scaffold standard artifacts from `.oat/templates/`, and set `.oat/active-project`.

## Progress Indicators (User-Facing)

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ NEW PROJECT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step work (validation, scaffolding, dashboard refresh), print 2–5 short step indicators.
- For long-running operations, print a brief “starting…” line and a matching “done” line (duration optional).

## Process

### Step 0: Resolve Projects Root

Resolve `{PROJECTS_ROOT}` (same order as other OAT skills):

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(cat .oat/projects-root 2>/dev/null || echo \".oat/projects/shared\")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

### Step 1: Get Project Name

If not provided in `$ARGUMENTS`, ask the user for `{project-name}` (slug format: alphanumeric/dash/underscore only).

### Step 2: Scaffold Project (Deterministic)

Use the CLI scaffolder:

```bash
pnpm run cli -- project new "{project-name}" --mode full
```

Optional flags:
- `--force` (non-destructive; only fills missing files/dirs, does not overwrite)
- `--no-set-active`
- `--no-dashboard`

### Step 3: Confirm + Next Step

Confirm to the user:
- Project path created: `{PROJECTS_ROOT}/{project-name}`
- Active project pointer set: `.oat/active-project`
- Repo State Dashboard refreshed: `.oat/state.md` (if enabled)

Then explicitly instruct the user to run discovery next:
- Next command: `oat-project-discover`

## Success Criteria

- ✅ `{PROJECTS_ROOT}/{project-name}/` exists
- ✅ Standard artifacts exist in the project dir (copied from `.oat/templates/*.md`)
- ✅ `.oat/active-project` points at the project path
- ✅ `.oat/state.md` is refreshed (unless disabled)
