---
name: oat-worktree-bootstrap
description: Use when creating or resuming a git worktree for OAT implementation. Creates or validates a worktree and runs OAT bootstrap checks.
argument-hint: "<branch-name> [--base <ref>] [--path <root>] [--existing]"
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion
---

# Worktree Bootstrap

Create or resume a git worktree and prepare it for OAT development.

## Prerequisites

- Git repository is clean enough to create/switch worktrees.
- Node.js and pnpm are available in the target environment.
- OAT project files exist (`.oat/`, `.agents/`).

## Mode Assertion

**OAT MODE: Worktree Bootstrap**

**Purpose:** Establish an isolated workspace and run standard OAT readiness checks before implementation work.

**BLOCKED Activities:**
- No implementation code changes unrelated to worktree setup.
- No destructive rewrite of existing project artifacts.

**ALLOWED Activities:**
- Create/reuse worktree paths.
- Run bootstrap and readiness checks.
- Update related state/docs for workspace readiness.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ WORKTREE BOOTSTRAP
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before multi-step operations, print 2–5 short step indicators.
- For long-running checks, print a start line and a completion line.

## Inputs

- Required for creation mode: `<branch-name>`
- Optional:
  - `--base <ref>` (default: `origin/main`)
  - `--path <root>` (explicit worktree root override)
  - `--existing` (bootstrap/validate existing worktree instead of creating one)

## Process

### Step 0: Resolve Repository Context

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
REPO_NAME=$(basename "$REPO_ROOT")
```

### Step 0.5: Validate Active Project Pointer

If `.oat/active-project` exists:
- verify the pointed path exists and contains `state.md`
- if invalid, do **not** silently rewrite it
- prompt user to run one of:
  - `oat-project-clear-active`
  - `oat-project-open`
- require explicit confirmation before continuing with worktree bootstrap

### Step 1: Resolve Worktree Root

Resolve root using this precedence:

1. Explicit `--path <root>`
2. `OAT_WORKTREES_ROOT`
3. `.oat/config.json` -> `worktrees.root`
4. Existing roots in repository (`.worktrees`, `worktrees`, `../<repo>-worktrees`)
5. Fallback default: `../<repo>-worktrees`

For repo-relative values, resolve from `REPO_ROOT`.

If the resolved root is project-local (`.worktrees` or `worktrees`), verify it is ignored by git before creating a new worktree.

### Step 2: Create or Reuse Worktree

- If `--existing`, validate the current directory is a git worktree and continue.
- Otherwise:
  - validate branch name format (`^[a-zA-Z0-9._/-]+$`)
  - resolve target path as `{root}/{branch-name}`
  - if branch already exists locally:
    - `git worktree add "{target-path}" "{branch-name}"`
  - if branch does not exist:
    - `git worktree add "{target-path}" -b "{branch-name}" "{base-ref}"`

`{base-ref}` defaults to `origin/main` unless `--base` is provided.

If worktree creation fails, stop and report the exact git error with remediation guidance.

### Step 3: Run OAT Bootstrap

Run bootstrap and readiness checks in the target worktree:

```bash
pnpm run worktree:init
pnpm run cli -- status --scope project
pnpm test
git status --porcelain
```

Required behavior:
- Stop immediately if `worktree:init` or `status` fails.
- If `pnpm test` fails:
  - show a concise failure summary
  - ask the user whether to `abort` or `proceed anyway`
  - if user proceeds, append a timestamped baseline-failure note to active project `implementation.md`
- If `git status --porcelain` is not clean after bootstrap/tests, stop and require cleanup before reporting ready.

### Step 4: Output Ready State

Report:
- resolved worktree path
- active branch
- bootstrap/verification status
- next command: `oat-project-implement`

## References

- `references/worktree-conventions.md`

## Success Criteria

- ✅ Worktree exists (or existing worktree validated).
- ✅ OAT bootstrap completed without blocking errors.
- ✅ User receives a clear next action for implementation.
