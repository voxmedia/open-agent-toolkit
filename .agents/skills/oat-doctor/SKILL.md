---
name: oat-doctor
version: 1.0.0
description: Use when you need to diagnose your OAT setup, check for outdated skills, identify misconfigurations, or get a summary of installed tools and config. Runs health checks and recommends corrective actions.
argument-hint: '[--summary]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Bash, Glob, Grep, AskUserQuestion
---

# OAT Doctor

Diagnose your OAT setup at both project and user levels. Checks for skill updates, identifies misconfigurations, summarizes what's installed, and recommends corrective actions.

## Prerequisites

- OAT CLI installed and available as `oat` in PATH.
- At least one `oat init` has been run (project or user level).

## Mode Assertion

**OAT MODE: Doctor (Diagnostic)**

**Purpose:** Inspect OAT setup and report findings with actionable fix commands. Never modify files or configuration.

**BLOCKED Activities:**

- No editing configuration files, skills, or templates.
- No running `oat init`, `oat sync`, `oat tools update`, or any mutating commands.
- No creating, modifying, or deleting any files.

**ALLOWED Activities:**

- Running `oat` CLI commands with `--json` flag for read-only data gathering.
- Reading files to inspect configuration state.
- Reading `~/.oat/docs/` for config key explanations.
- Presenting diagnostic findings and recommendations to the user.

**Self-Correction Protocol:**
If you catch yourself:

- About to run a mutating command → STOP and present it as a recommendation instead.
- Editing a file to fix a problem → STOP and tell the user the fix command.

**Recovery:**

1. Return to read-only diagnostic mode.
2. Present the needed fix as an actionable recommendation.

## Progress Indicators (User-Facing)

Print a phase banner once at start:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCTOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### Check Mode (default)

- `[1/4] Gathering installed tools…`
- `[2/4] Checking for outdated skills…`
- `[3/4] Inspecting configuration…`
- `[4/4] Reporting findings…`

### Summary Mode (`--summary`)

- `[1/6] Gathering installed tools…`
- `[2/6] Checking for outdated skills…`
- `[3/6] Inspecting configuration…`
- `[4/6] Discovering available packs…`
- `[5/6] Checking sync status…`
- `[6/6] Building dashboard…`

## Process

### Step 0: Determine Mode

Read `$ARGUMENTS`:

- If `$ARGUMENTS` contains `--summary` → **summary mode**
- Otherwise → **check mode** (default)

### Step 1: Gather Installed Tools

```bash
TOOLS_JSON=$(oat tools list --json --scope all 2>/dev/null || echo '{"tools":[]}')
```

Parse the JSON output. Each tool has: `name`, `type` (skill/agent), `scope` (project/user), `version`, `bundledVersion`, `pack` (core/docs/ideas/workflows/utility/project-management/research/custom), `status` (current/outdated/newer/not-bundled).

### Step 2: Check for Outdated Skills

```bash
OUTDATED_JSON=$(oat tools outdated --json --scope all 2>/dev/null || echo '{"tools":[]}')
```

Parse the JSON output. Each entry has `name`, `version` (installed), `bundledVersion` (available), `pack`, `scope`.

### Step 3: Inspect Configuration

```bash
CONFIG_JSON=$(oat config list --json 2>/dev/null || echo '{"configs":[]}')
```

Check for issues:

- **Stale `activeProject` pointer:** If `activeProject` is set, verify the directory exists. If not, warn.
- **Stale `activeIdea` pointer:** If `activeIdea` is set, verify the directory exists. If not, warn.
- **Missing `projects.root`:** If not configured and no default exists, warn.

For config key explanations, read from the bundled docs at `~/.oat/docs/`. Check `reference/file-locations.md` and `guide/cli-reference.md` for authoritative descriptions.

### Step 4: Check Mode — Report Findings

If in **check mode**, output a terse, `brew doctor`-style checklist.

**Format:**

```
Your OAT setup has {N} warning(s).

⚠  {N} outdated skill(s)
   Run: oat tools update --scope {scope}

⚠  Stale activeProject pointer: {path} does not exist
   Run: oat config set activeProject ""

⚠  Stale activeIdea pointer: {path} does not exist
   Run: oat config set activeIdea ""

⚠  {pack} pack not installed at {scope} scope
   Run: oat init tools
```

If no warnings:

```
Your OAT setup looks good. No issues found.
```

Stop here for check mode.

### Step 5: Summary Mode — Discover Available Packs

For summary mode, compare installed skills against the full manifest to identify available-but-uninstalled packs and skills.

**Bundled skill manifest (source of truth):**

Core pack skills:

- oat-docs, oat-doctor

Workflow pack skills:

- oat-project-capture, oat-project-clear-active, oat-project-complete
- oat-project-design, oat-project-discover, oat-project-document
- oat-project-implement, oat-project-import-plan, oat-project-new
- oat-project-open, oat-project-plan, oat-project-plan-writing
- oat-project-pr-final, oat-project-pr-progress, oat-project-progress
- oat-project-promote-spec-driven, oat-project-quick-start
- oat-project-reconcile, oat-project-review-provide
- oat-project-review-receive, oat-project-review-receive-remote
- oat-project-spec, oat-project-subagent-implement
- oat-repo-knowledge-index, oat-worktree-bootstrap, oat-worktree-bootstrap-auto

Ideas pack skills:

- oat-idea-new, oat-idea-ideate, oat-idea-summarize, oat-idea-scratchpad

Docs pack skills:

- oat-agent-instructions-analyze, oat-agent-instructions-apply
- oat-docs-analyze, oat-docs-apply

Utility pack skills:

- create-agnostic-skill
- oat-repo-maintainability-review, oat-review-provide
- oat-review-receive, oat-review-receive-remote

Project management pack skills:

- oat-pjm-add-backlog-item, oat-pjm-update-repo-reference
- oat-pjm-review-backlog

Research pack skills:

- analyze, compare, deep-research
- skeptic, synthesize

For each pack, determine:

- **Installed:** all pack skills found in installed tools list
- **Partially installed:** some but not all pack skills found
- **Not installed:** no pack skills found
- **Missing skills:** specific skills in the manifest but not in installed list (highlights newly-added skills after CLI upgrades)

### Step 6: Summary Mode — Check Sync Status

If in a project directory (`.oat/` exists):

```bash
SYNC_STATUS=$(oat sync --dry-run --json --scope project 2>/dev/null || echo '{}')
```

Report whether provider views are in sync or have pending changes.

### Step 7: Summary Mode — Build Dashboard

Output a full dashboard:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ DOCTOR SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Installed Packs

| Pack      | Scope   | Skills | Status   |
| --------- | ------- | ------ | -------- |
| core      | user    | 2/2    | current  |
| docs      | project | 4/4    | current  |
| workflows | project | 26/26  | current  |
| ideas     | user    | 4/4    | current  |
| project-management | project | 3/3 | current |
| research  | project | 5/5    | current  |
| utility   | project | 5/5    | outdated |

## Outdated Skills

| Skill                   | Installed | Available | Scope   |
| ----------------------- | --------- | --------- | ------- |
| oat-project-implement   | 1.1.0     | 1.2.0     | project |

## Available But Not Installed

- **docs** pack: oat-docs-analyze, oat-docs-apply, oat-agent-instructions-analyze, oat-agent-instructions-apply (4 skills available)
  → Run: oat tools install docs --scope {scope}
- **project-management** pack: oat-pjm-add-backlog-item, oat-pjm-update-repo-reference, oat-pjm-review-backlog (3 skills available)
  → Run: oat tools install project-management --scope {scope}
- **research** pack: analyze, compare, deep-research, skeptic, synthesize (5 skills available)
  → Run: oat tools install research --scope {scope}

## Configuration

| Key                  | Value                     | Source  |
| -------------------- | ------------------------- | ------- |
| activeProject        | .oat/projects/shared/foo  | local   |
| activeIdea           | (not set)                 | -       |
| projects.root        | .oat/projects/shared      | default |
| documentation.root   | (not set)                 | -       |
| worktrees.root       | (not set)                 | -       |

### Config Key Explanations

Read config key descriptions from `~/.oat/docs/reference/file-locations.md` and `~/.oat/docs/guide/cli-reference.md`. If docs are not available, use these fallback descriptions:

- **activeProject:** Path to the currently active OAT project. Set automatically by project skills.
- **activeIdea:** Path to the currently active idea. Set by oat-idea-new.
- **lastPausedProject:** Path to the last paused project for quick resume.
- **projects.root:** Base directory for all OAT projects. Default: `.oat/projects/shared`.
- **documentation.root:** Root directory for documentation. Used by docs skills.
- **documentation.config:** Path to docs config file (e.g., mkdocs.yml).
- **documentation.tooling:** Docs tooling in use (e.g., mkdocs, fumadocs).
- **documentation.requireForProjectCompletion:** Whether docs update is required before project completion.
- **worktrees.root:** Base directory for git worktrees. Used by worktree-bootstrap skills.

## Sync Status

{In sync / N pending changes across M providers}

## Warnings

{Same warnings as check mode, if any}

## Recommendations

- Run `oat tools update` to update outdated skills.
- Run `oat init tools` to install newly available packs.
- Run `oat sync --scope project` to sync provider views.
```

Adapt the dashboard to show only sections with relevant data. Omit empty sections.

## Success Criteria

- ✅ Check mode reports all warnings with actionable fix commands.
- ✅ Summary mode shows a complete dashboard of installed packs, config, and available skills.
- ✅ Outdated skills are detected and update commands are provided.
- ✅ Stale config pointers are identified.
- ✅ Available-but-uninstalled packs/skills are surfaced (discovery gap closed).
- ✅ No files are modified — purely diagnostic output.
