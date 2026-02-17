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

### Step 1: Resolve Worktree Root

Use precedence defined in `references/worktree-conventions.md`.

### Step 2: Create or Reuse Worktree

- If `--existing`, validate current path and continue.
- Otherwise create/reuse `{root}/{branch-name}` using `git worktree`.

### Step 3: Run OAT Bootstrap

Run bootstrap and readiness checks in the target worktree:

```bash
pnpm run worktree:init
pnpm run cli -- status --scope project
```

### Step 4: Output Ready State

Report worktree path, active branch, and next command to continue implementation.

## References

- `references/worktree-conventions.md`

## Success Criteria

- ✅ Worktree exists (or existing worktree validated).
- ✅ OAT bootstrap completed without blocking errors.
- ✅ User receives a clear next action for implementation.
