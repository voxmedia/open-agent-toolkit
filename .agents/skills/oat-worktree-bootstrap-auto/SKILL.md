---
name: oat-worktree-bootstrap-auto
version: 1.2.2
description: Use when an orchestrator/subagent needs autonomous worktree bootstrap. Non-interactive companion to oat-worktree-bootstrap.
argument-hint: '<branch-name> [--base <ref>] [--path <root>] [--baseline-policy <strict|allow-failing>]'
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Bash, Glob, Grep
---

# Autonomous Worktree Bootstrap

Non-interactive worktree bootstrap for orchestrator and subagent execution flows. Creates or reuses a worktree, runs baseline checks, and reports structured status — all without user prompts.

> ⚠️ **When not to substitute.** This skill is the **only** supported mechanism for orchestrator-driven worktree creation in OAT skills. Host-native isolation primitives — Claude Code's `Agent({ isolation: "worktree" })`, Cursor's worktree-isolated agent invocations, and equivalents in other hosts — are **not** substitutes. They may use the primary repo's checkout (often `main`) as the base regardless of the caller's current branch, silently producing a worktree at the wrong base. OAT orchestrators dispatching mid-run from a feature branch MUST go through this skill with an explicit `--base` so the resulting worktree contains the orchestrator's prior commits.

## Relationship to oat-worktree-bootstrap

This skill is the **autonomous companion** to `oat-worktree-bootstrap`. Key differences:

| Concern          | oat-worktree-bootstrap (manual)      | oat-worktree-bootstrap-auto (autonomous) |
| ---------------- | ------------------------------------ | ---------------------------------------- |
| Invocation       | User-invocable, interactive          | Agent-only, non-interactive              |
| Prompts          | Uses `AskUserQuestion` for decisions | Never uses `AskUserQuestion`             |
| Failure handling | Asks user to abort/proceed           | Policy-driven (strict or allow-failing)  |
| Status output    | Human-readable banners               | Structured machine-parseable output      |
| Logging          | Console + optional artifact          | Artifact-first, console fallback         |

Both skills share the same worktree root resolution precedence and branch naming conventions.

## Progress Indicators (User-Facing)

When this skill is executed, provide concise status updates:

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ WORKTREE BOOTSTRAP AUTO
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before major phases, print compact indicators, for example:
  - `[1/6] Resolving worktree root…`
  - `[2/6] Creating/reusing worktree…`
  - `[3/6] Verifying resolved base in worktree HEAD…`
  - `[4/6] Running baseline checks…`
  - `[5/6] Syncing provider directories…`
  - `[6/6] Returning structured status…`

## Inputs

### Required

- `<branch-name>` — Target branch for the worktree.

### Optional

| Parameter                    | Default                 | Description                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--base <ref>`               | `origin/main`           | Base ref to branch from. **Callers running inside a worktree-on-a-feature-branch (e.g., an `oat-project-implement` orchestrator dispatching mid-run) MUST pass `--base` explicitly** — either the orchestrator's current branch name or the resolved current HEAD SHA. The default `origin/main` is the **wrong** choice for orchestrators dispatching mid-run; using it will land the worktree at `main`. |
| `--path <root>`              | Resolved via precedence | Explicit worktree root override                                                                                                                                                                                                                                                                                                                                                                            |
| `--baseline-policy <policy>` | `strict`                | Baseline check failure policy                                                                                                                                                                                                                                                                                                                                                                              |

### Baseline Policy

| Policy          | Behavior                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `strict`        | Fail fast on any baseline check failure. Return error status immediately.                                  |
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

### Step 2.5: Propagate Local-Only Config + Local Paths

After the worktree is created or reused, copy gitignored local-only config and sync configured local paths.

**Config propagation:**

```bash
SRC="$REPO_ROOT/.oat/config.local.json"
DST="$TARGET_PATH/.oat/config.local.json"
if [[ -f "$SRC" && ! -f "$DST" ]]; then
  cp "$SRC" "$DST"
fi
```

- Only copy if source exists and destination does not (never overwrite).
- `activeIdea` is stored in `config.local.json`, so it propagates automatically.

**Local paths sync:**

```bash
oat local sync "$TARGET_PATH" 2>/dev/null || true
```

- Copies configured `localPaths` (e.g., `.oat/ideas/`, `.oat/projects/local/`) into the worktree.
- Non-blocking: if sync fails or no `localPaths` are configured, bootstrap continues.

### Step 2.7: Verify Resolved Base in Worktree HEAD

Before any baseline checks run, verify the worktree actually branched from the resolved base. This catches host-native or git-internal misbehavior that would otherwise silently land the worktree at the wrong base.

1. Resolve the base SHA:

   ```bash
   RESOLVED_BASE_SHA=$(git -C "$REPO_ROOT" rev-parse "$BASE_REF")
   ```

2. Capture the worktree HEAD:

   ```bash
   OBSERVED_HEAD_SHA=$(git -C "$TARGET_PATH" rev-parse HEAD)
   ```

3. Confirm the resolved base is reachable from the worktree HEAD:

   ```bash
   git -C "$TARGET_PATH" merge-base --is-ancestor "$RESOLVED_BASE_SHA" "$OBSERVED_HEAD_SHA"
   ```

   - Exit `0` → base is contained in the worktree HEAD; continue to Step 3.
   - Non-zero exit → base mismatch.

**On base mismatch:** treat as a bootstrap failure. Do **not** silently land at the wrong base, do **not** proceed to baseline checks. Apply the configured baseline policy to the failure:

- `strict` → return immediately with `status: failed`, `reason: base-mismatch`, populated `expected_base_sha` and `observed_head_sha`, and the worktree path. The orchestrator is expected to cancel the dispatch and degrade.
- `allow-failing` → emit a structured warning (`reason: base-mismatch`, with `expected_base_sha` and `observed_head_sha`), append a base-mismatch entry to `implementation.md` if an active project exists, and continue to Step 3 only if the caller has explicitly opted into a degraded outcome. In all other cases prefer fail-fast — base mismatch is rarely recoverable.

### Step 3: Run Baseline Checks

Execute in the target worktree directory:

```bash
pnpm run worktree:init          # install + build + sync
oat status --scope project
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
oat sync --scope all
```

### Step 5: Return Structured Status

Return a structured status object (for orchestrator consumption):

```yaml
status: success | error | warning | failed
worktree_path: '{absolute-path}'
branch: '{branch-name}'
base_ref: '{base-ref}'
resolved_base_sha: '{sha resolved from base-ref}'
observed_head_sha: '{sha of worktree HEAD after add}'
checks:
  worktree_init: pass | fail | skip
  project_status: pass | fail | skip
  tests: pass | fail | skip
  git_clean: pass | fail | skip
  provider_sync: pass | fail | skip
warnings: [] # List of warning messages (allow-failing mode)
error: null # Error message (strict mode failure)
reason: null # Structured reason on failure (e.g., base-mismatch)
expected_base_sha: null # Populated when reason is base-mismatch
baseline_policy: strict | allow-failing
```

`resolved_base_sha` and `observed_head_sha` are populated on **every** terminal status (success, warning, error, failed) so callers can perform belt-and-suspenders post-verification on the success path as well as diagnose the failure path.

**Status determination:**

- `success`: All checks passed and Step 2.7 base-resolution verification passed.
- `warning`: Some checks failed under `allow-failing` policy (Step 2.7 still passed).
- `error`: A baseline check failed under `strict` policy, or worktree creation failed.
- `failed` (with `reason: base-mismatch`): Step 2.7 base-resolution verification failed. Callers should treat this distinctly from a generic baseline error — it is a contract violation, not a flaky check.

## Error Handling

| Scenario                                   | Behavior                                                                                                                   |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Worktree creation fails                    | Return error status with git error message                                                                                 |
| Branch already checked out elsewhere       | Return error with worktree location info                                                                                   |
| Base mismatch (Step 2.7 fails, strict)     | Return `status: failed`, `reason: base-mismatch`, with `expected_base_sha` and `observed_head_sha`. Do not run baselines.  |
| Base mismatch (Step 2.7 fails, allow-fail) | Emit structured warning with `reason: base-mismatch`, log to artifacts, prefer fail-fast unless caller opted into degrade. |
| Baseline check fails (strict)              | Return error with check name and failure output                                                                            |
| Baseline check fails (allow-failing)       | Add to warnings, continue, log to artifacts                                                                                |
| No active project                          | Skip artifact logging, use console only                                                                                    |
| Invalid branch name                        | Return error before attempting creation                                                                                    |

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

When a base mismatch is detected (Step 2.7) and an active project exists, append a distinct entry regardless of baseline policy so post-mortems can find it:

```markdown
### {YYYY-MM-DD} — Base Mismatch (autonomous bootstrap)

**Worktree:** {path}
**Branch:** {branch-name}
**Expected base SHA:** {expected_base_sha}
**Observed HEAD SHA:** {observed_head_sha}
**Base ref:** {base-ref}
```

## Policy Flags

| Flag                | Type                        | Default  | Description                                  |
| ------------------- | --------------------------- | -------- | -------------------------------------------- |
| `--baseline-policy` | `strict` \| `allow-failing` | `strict` | Controls behavior when baseline checks fail. |

**Policy details:**

| Policy          | On Failure                          | Logging                                    | Status Output     |
| --------------- | ----------------------------------- | ------------------------------------------ | ----------------- |
| `strict`        | Fail fast, return error immediately | Error in status output                     | `status: error`   |
| `allow-failing` | Continue, collect warnings          | Append to `implementation.md` (or console) | `status: warning` |

**Orchestrator integration:**

- When invoked by `oat-project-implement` in parallel mode, the baseline policy is passed through from the orchestration run policy.
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
