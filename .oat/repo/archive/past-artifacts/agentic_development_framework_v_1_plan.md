# Open Agent Toolkit (OAT)

## Overview

**Open Agent Toolkit (OAT)** is an open‑source toolkit built on **open standards** for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, Codex CLI). It provides a provider‑agnostic interoperability layer first, with **optional, human‑in‑the‑loop workflow scaffolding** layered on top.

**Tagline:** *Open standards, open source tooling for interoperable agent development across providers.*

---

## Design Goals

- **Provider‑agnostic interoperability** (primary value)
- File‑based, no daemon
- Low‑friction adoption (use only what you need)
- Human‑in‑the‑loop by default
- Modular and extensible
- Works with open standards (Agent Skills, subagents, hooks)

---

## Directory Model

### Agent‑facing standard surface

```
.agent/
  skills/
  agents/
  hooks/
```

### User‑level (global) agent surface (where supported)

Many tools (and OpenSkills) also support a **global universal skills directory**:

- `~/.agent/skills/` (global universal skills)

Some providers also have their own global locations (e.g. `~/.claude/skills/`).

### Toolkit internals

```
.oat/
  projects/
    shared/
    local/
    archive/
  workflows/
  knowledge/
  providers/
  state.md
```

- `.agent/` contains standards‑based artifacts that providers load directly (or via small “loader” instructions)
- `.oat/` contains coordination, workflow, and project tooling

### Provider‑specific directories (current known)

- Cursor hooks: `.cursor/hooks`
- Claude hooks: `.claude/hooks`
- Gemini CLI hooks: scripts commonly live under `.gemini/hooks`, configured via `.gemini/settings.json`
- Codex: `.codex/agents` (per current understanding)

---

## Project Modes

- **Shared mode**: project metadata checked into feature branches, removed before merge and archived locally
- **Local/solo mode**: project metadata always gitignored

Both modes archive to `.oat/projects/archive` locally.

---

## Workflow (Optional)

- Discover → Plan → Review
- Phased execution with checkpoints
- Agent self‑review + follow‑up execution
- Optional user approval gates
- Parallelism via worktrees / stacked PRs

---

## Knowledge & State

- Generated knowledge artifacts (brownfield analysis, context files)
- Freshness tracked via base SHA + comparison SHA (squash‑merge safe)
- Lightweight `state.md` for fast agent orientation

---

## Subagent / Skill Sync

- Canonical definitions live in `.agent/`
- Provider‑specific directories are symlinked/generated
- Stray provider‑local agents are detected and reconciled with user approval

---

## CLI

### Principles

- File-based commands (no daemon)
- Deterministic output; safe defaults
- Works even if you only want provider interoperability
- Dry-run and diff-first for any mutation

### Command groups

#### `oat init`

Bootstraps a repo:

- Creates `.agent/{skills,agents,hooks}` (if missing)
- Creates `.oat/` structure (projects/workflows/knowledge/providers)
- Writes/updates `AGENTS.md` (or `agents.md`) to document how to load skills and where canonical artifacts live
- Optionally installs git hooks (pre-commit) for sync enforcement

Key flags:

- `--providers auto|claude|cursor|codex|all`
- `--install-hooks` / `--no-install-hooks`
- `--mode minimal|workflow` (minimal = interop only)

#### `oat status`

Shows repo health:

- Provider detection + capability matrix
- Drift summary (canonical vs provider dirs)
- Stray files found in provider dirs
- Project metadata policy checks (e.g., no shared projects on main)
- Knowledge freshness (base SHA vs main)

Flags:

- `--json`
- `--verbose`

#### `oat sync`

Reconciles `.agent/*` with provider directories using provider adapters.

- Default behavior is **preview** (shows planned actions)
- Applies on `--apply`
- Can adopt provider-local “strays” into canonical with `--adopt-strays`

Flags:

- `--providers auto|claude|cursor|codex|all`
- `--strategy symlink|copy|auto`
- `--apply` (otherwise dry-run)
- `--adopt-strays` (interactive by default; `--yes` for non-interactive)
- `--clean` (remove provider artifacts that are no longer in canonical)

#### `oat doctor`

Environment diagnostics:

- Validates provider directories exist / are writable
- Tests symlink support
- Prints actionable fix steps

#### `oat project …` (optional layer)

OAT supports switching between projects (shared and local), including auto-switch behavior when changing git branches.

##### `oat project new <name>`

Creates a project workspace and state file.

- `--mode shared|local`
- Writes `.oat/projects/(shared|local)/<name>/state.md`
- Scaffolds workflow docs (optional): discovery/prd/plan/implementation + reviews
- Updates the active project pointer

##### `oat project open <name>`

Sets the active project.

When another project is already active:

- Default: **switch** active project and preserve the previous project as “recent”
- Writes an active pointer file: `.oat/active-project` containing the project path + mode
- Maintains a small MRU list: `.oat/recent-projects` (last N)

Flags:

- `--keep-open` (no-op; maintains current active project)
- `--force` (switch even if current project has “dirty” state indicators)
- `--mode shared|local|auto` (auto resolves name conflicts)

##### Auto-switch on branch change (shared projects)

For version-controlled shared projects, OAT can automatically select the correct active project when switching branches.

Mechanism:

- Each shared project includes metadata (e.g., `.oat/projects/shared/<name>/project.json`) with a stable `project_id`.
- OAT records the last active `project_id` per branch in `.oat/branch-map.json`.
- A lightweight git hook (post-checkout/post-merge) can invoke `oat project auto`.

`oat project auto` behavior:

- If the current branch contains exactly one shared project → activate it
- If multiple shared projects exist → prefer last active for that branch (branch-map), otherwise prompt
- If none exist → keep current active project if it’s local; otherwise clear active pointer

##### `oat project close <name>`

Archives the project:

- Shared mode: moves `.oat/projects/shared/<name>` → `.oat/projects/archive/<name>` and removes from git (guarded)
- Local mode: moves local active → archive

Flags:

- `--archive-only` (no git operations)
- `--git-rm` (default for shared)

##### Project doc set (draft)

OAT can scaffold a four-doc set:

- `discovery.md` (brainstorm / exploration)
- `prd.md` (requirements, constraints, success metrics)
- `plan.md` (phases, checkpoints, tasks)
- `implementation.md` (execution log + PR description source)

This is optional; v1 can start with discovery + plan + implementation and evolve.

#### `oat knowledge …` (optional layer) (optional layer)

##### `oat knowledge generate`

Generates/refreshes brownfield context files.

- Writes metadata: `base_ref`, `base_commit`, `generated_at`, `generator_version`, optional `inputs_hash`

##### `oat knowledge status`

Shows freshness and recommended updates based on `base_commit..origin/main` diff.

---

## Provider adapters

Provider adapters are small, declarative modules that teach OAT how to:

1. **Locate provider-specific directories** for skills/agents/hooks
2. **Detect supported capabilities** (hooks supported? subagent format constraints?)
3. **Apply a sync strategy** (symlink/copy) safely and reversibly
4. **Detect drift & strays** in provider directories

### Canonical source of truth

- ``** is always canonical**.
- Provider directories are *views* (symlink/copy) generated from `.agent`.
- If a provider only supports provider directories for a given artifact, OAT still treats `.agent` as source-of-truth and materializes provider views via symlink/copy.

### Precedence model

- **Project scope wins over user scope**.
- `~/.agent/*` supplies defaults; repo `.agent/*` overrides.

### Drift & strays handling

- `oat status` always reports **strays** (files present in provider dirs but not in `.agent/*`).
- `oat sync` enters an **interactive adoption prompt** when strays are present (unless `--no-interactive`).
  - Presents a list of strays with a multi-select UI.
  - Actions: Adopt selected → move into `.agent/*` → regenerate provider views.
  - Options: Adopt all / adopt some / skip (explicit).

### Cleaning policy

- By default, OAT does **not** delete provider files.
- When strays are adopted into `.agent`, provider views are regenerated (usually symlink), so “clean” is rarely needed.
- If supported, `--clean` only removes **managed** provider files recorded in the manifest (never untracked user files).

### Sync manifest

OAT maintains a sync manifest to track what it manages:

- `.oat/sync/manifest.json`
  - provider → strategy (symlink/copy)
  - canonical → provider path mapping
  - hashes for copied content

Deletions and drift decisions only apply to manifest-managed files.

### Strategy rules

- Default strategy: `auto`
- `auto` prefers symlink, falls back to copy when symlinks aren’t viable (OS/filesystem/permissions/environment).
- Persist per-provider+repo decisions in `.oat/providers/<provider>.json`.

### Known provider directories (partial)

- Cursor hooks: `.cursor/hooks`
- Claude hooks: `.claude/hooks`
- Codex agents: `.codex/agents` (pending confirmation)
- Gemini CLI: `.gemini/settings.json` + hook scripts under `.gemini/hooks` (pending confirmation)

---

## Projects

### Global → project sync for reproducibility

To avoid “surprise” behavior from user-scope artifacts, OAT supports **promoting** global items into a project so they become visible and shareable.

- `oat sync --include-user` merges `~/.agent/*` into the provider views for the current repo, with **project **``** taking precedence**.
- `oat promote <path|pattern>` copies selected user-scope items into repo `.agent/*` (interactive multi-select).
  - Example: `oat promote skills` or `oat promote hooks` or `oat promote agents/my-helper`.
- `oat status` surfaces what’s coming from user scope vs project scope.

This makes it easy to keep a personal “global book” while selectively syncing it into a repo when collaboration/reproducibility matters.

### State: what lives where

We’ll likely keep two complementary state artifacts:

#### 1) Project state (per project)

Lives inside the project directory, e.g.:

- `.oat/projects/(shared|local)/<name>/state.md`

Purpose:

- workflow progress (phase, checkpoints)
- links to discovery/plan/implementation docs
- last activity, blockers, pending todos
- decisions summary (or link to ADRs)

This is what an agent reads to understand **"what’s happening in this project"**.

#### 2) OAT workspace state (per repo)

Lives at repo root:

- `.oat/projects/state.json`

Purpose:

- which project is currently active (`active`)
- recent projects (`recent` MRU)
- branch-aware mapping (`branch_map`)
- user preferences for this repo (optional)

This is what OAT reads to understand **"what project should commands operate on"**.

#### Optional `state.md` at `.oat/state.md`

A human/agent-friendly dashboard derived from `state.json` + the active project’s `state.md`.

We can finalize exactly what fields we want before deciding whether both `state.json` and `.oat/state.md` are needed.

### Active project & branch awareness

- `oat project open` switches active project when another is open (default). Preserves previous project in MRU.
- Branch-aware auto-switch is enabled via git hooks (post-checkout/post-merge) that run `oat project auto`.

### Shared projects enforcement

- Provide:
  - a pre-commit hook (auto-installable)
  - a composite GitHub Action users can add to CI
- Rule: prevent `.oat/projects/shared/**` from reaching protected branches / PRs to main.

### Docs scaffolding (v1)

- Scaffold: `discovery.md`, `plan.md`, `implementation.md`.
- PRD can be added later; workflows/skills must be updated when introduced.

---

## Workflow dogfooding priority

While sync/interop is critical, prioritize establishing the project workflow skills early so OAT can be used to build OAT (manual triggers first; hooks/automation later).

---

## Status

- Naming locked: **Open Agent Toolkit (OAT)**

- Next focus:

  1. finalize provider directory mapping table (known vs unknown)
  2. define project workflow skills + templates (discovery/plan/implementation)
  3. implement `oat init/status/sync/doctor` around adapters + manifest

- Naming locked: **Open Agent Toolkit (OAT)**

- CLI + adapter model defined at high level

- Next focus: finalize v1 adapter schemas + project switching UX

- Naming locked: **Open Agent Toolkit (OAT)**

- Next focus: finalize provider adapter schema + implement CLI commands

