---
name: oat-worktree-bootstrap-auto
description: Autonomous worktree bootstrap for orchestrator/subagent use. Non-interactive companion to oat-worktree-bootstrap.
argument-hint: "<branch-name> [--base <ref>] [--path <root>] [--baseline-policy <strict|allow-failing>]"
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Autonomous Worktree Bootstrap

Non-interactive worktree bootstrap for orchestrator and subagent execution flows. Creates or reuses a worktree, runs baseline checks, and reports structured status — all without user prompts.

## Relationship to oat-worktree-bootstrap

This skill is the **autonomous companion** to `oat-worktree-bootstrap`. Key differences:

| Concern | oat-worktree-bootstrap (manual) | oat-worktree-bootstrap-auto (autonomous) |
|---------|--------------------------------|------------------------------------------|
| Invocation | User-invocable, interactive | Agent-only, non-interactive |
| Prompts | Uses `AskUserQuestion` for decisions | Never uses `AskUserQuestion` |
| Failure handling | Asks user to abort/proceed | Policy-driven (strict or allow-failing) |
| Status output | Human-readable banners | Structured machine-parseable output |
| Logging | Console + optional artifact | Artifact-first, console fallback |

Both skills share the same worktree root resolution precedence and branch naming conventions.

## Inputs

### Required

- `<branch-name>` — Target branch for the worktree.

### Optional

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--base <ref>` | `origin/main` | Base ref to branch from |
| `--path <root>` | Resolved via precedence | Explicit worktree root override |
| `--baseline-policy <policy>` | `strict` | Baseline check failure policy |

### Baseline Policy

| Policy | Behavior |
|--------|----------|
| `strict` | Fail fast on any baseline check failure. Return error status immediately. |
| `allow-failing` | Continue on baseline failures. Emit structured warnings. Log failures to project artifacts when available. |

## Process

### Step 1: Resolve Worktree Root

Use the same resolution precedence as `oat-worktree-bootstrap`:

1. Explicit `--path <root>` (highest priority)
2. `OAT_WORKTREES_ROOT` environment variable
3. `.oat/config.json` → `worktrees.root`
4. First existing directory (ordered):
   a. `${REPO_ROOT}/.worktrees`
   b. `${REPO_ROOT}/worktrees`
   c. `../${REPO_NAME}-worktrees`
5. Fallback: `../${REPO_NAME}-worktrees`

If the resolved root is project-local (`.worktrees` or `worktrees`), verify it is gitignored.

### Step 2: Create or Reuse Worktree

- Validate branch name: `^[a-zA-Z0-9._/-]+$`
- Resolve target path: `{root}/{branch-name}`
- If branch exists locally: `git worktree add "{target-path}" "{branch-name}"`
- If branch does not exist: `git worktree add "{target-path}" -b "{branch-name}" "{base-ref}"`
- If worktree already exists at target path: reuse it (validate branch matches)

On failure: return structured error, do not prompt.

### Step 3: Run Baseline Checks

Execute in the target worktree directory:

```bash
pnpm run worktree:init          # install + build + sync
pnpm run cli -- status --scope project
pnpm test
git status --porcelain
```

Check behavior per baseline policy:

**strict mode:**
- Any check failure → immediately return error status with failure details.

**allow-failing mode:**
- Check failure → emit structured warning, continue to next check.
- Collect all warnings and include in final status output.
- Log failure context:
  - If active project with `implementation.md` exists → append timestamped baseline-failure note.
  - Otherwise → console output only (no fallback file creation).

### Step 4: Create Provider Directories

Worktrees do not inherit gitignored provider directories. Create them if missing:

```bash
mkdir -p "{target-path}/.claude/skills"
mkdir -p "{target-path}/.cursor/rules"
```

Then re-run sync to establish symlinks:

```bash
pnpm run cli -- sync --scope all --apply
```

### Step 5: Return Structured Status

Return a structured status object (for orchestrator consumption):

```yaml
status: success | error | warning
worktree_path: "{absolute-path}"
branch: "{branch-name}"
base_ref: "{base-ref}"
checks:
  worktree_init: pass | fail | skip
  project_status: pass | fail | skip
  tests: pass | fail | skip
  git_clean: pass | fail | skip
  provider_sync: pass | fail | skip
warnings: []          # List of warning messages (allow-failing mode)
error: null           # Error message (strict mode failure)
baseline_policy: strict | allow-failing
```

**Status determination:**
- `success`: All checks passed.
- `warning`: Some checks failed under `allow-failing` policy.
- `error`: A check failed under `strict` policy, or worktree creation failed.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Worktree creation fails | Return error status with git error message |
| Branch already checked out elsewhere | Return error with worktree location info |
| Baseline check fails (strict) | Return error with check name and failure output |
| Baseline check fails (allow-failing) | Add to warnings, continue, log to artifacts |
| No active project | Skip artifact logging, use console only |
| Invalid branch name | Return error before attempting creation |

## Artifact Logging

When baseline failures occur under `allow-failing` policy and an active project exists:

Append to `implementation.md` under `## Implementation Log`:

```markdown
### {YYYY-MM-DD} — Baseline Warning (autonomous bootstrap)

**Worktree:** {path}
**Branch:** {branch-name}
**Policy:** allow-failing
**Failures:**
- {check_name}: {failure summary}
```

## Policy Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--baseline-policy` | `strict` \| `allow-failing` | `strict` | Controls behavior when baseline checks fail. |

**Policy details:**

| Policy | On Failure | Logging | Status Output |
|--------|-----------|---------|---------------|
| `strict` | Fail fast, return error immediately | Error in status output | `status: error` |
| `allow-failing` | Continue, collect warnings | Append to `implementation.md` (or console) | `status: warning` |

**Orchestrator integration:**
- When invoked by `oat-subagent-orchestrate`, the baseline policy is passed through from the orchestration run policy.
- The orchestrator may set `--baseline-policy allow-failing` for exploratory runs and `strict` for production-quality execution.
- The bootstrap skill does not interpret HiLL checkpoints — that responsibility belongs to the orchestrator.

## Constraints

- **Never** use `AskUserQuestion` — all decisions are policy-driven.
- **Never** create fallback artifact files — log to existing artifacts or console only.
- **Never** modify implementation code — bootstrap and checks only.
- **Never** override or conflict with `oat-worktree-bootstrap` manual-safe behavior.

## Success Criteria

- Worktree exists and is on the correct branch.
- Baseline checks executed per policy.
- Structured status returned for orchestrator consumption.
- Failures logged to appropriate destination without user interaction.
