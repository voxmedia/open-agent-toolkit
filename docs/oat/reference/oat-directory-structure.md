# `.oat` Directory Structure

This document is the canonical reference for what lives under `.oat/`, what each file or directory does, and which parts are source-of-truth vs generated runtime state.

## Scope model

OAT uses two scopes for `.oat` data:

- Project scope: `<repo>/.oat/`
- User scope: `~/.oat/`

Project scope is used for project workflows and repo-local sync state. User scope is used for global ideas and user-level sync state.

## Top-level project `.oat/` layout

```text
.oat/
  active-idea
  config.json
  config.local.json
  projects/
    shared/
    local/
    archived/
  ideas/
  sync/
    manifest.json
    config.json
  templates/
  scripts/
  repo/
    knowledge/
    reference/
    reviews/
    archive/
```

## Top-level entries

| Path | Purpose | Notes |
|------|---------|-------|
| `.oat/config.json` | Shared repo runtime config for non-sync settings | Includes `worktrees.root`, `projects.root` |
| `.oat/config.local.json` | Local per-developer runtime state | Gitignored; includes `activeProject`, `lastPausedProject` |
| `.oat/active-idea` | Pointer to active idea | Used by idea skills |
| `.oat/projects/` | OAT project artifacts | `shared`, `local`, `archived` scopes |
| `.oat/ideas/` | Project-level ideas store | Often gitignored |
| `.oat/sync/` | Interop sync state/config | See details below |
| `.oat/templates/` | Artifact templates used by OAT skills | Source for scaffolding |
| `.oat/repo/` | Repo-level knowledge/reference/review artifacts | Durable operational records |

## `.oat/sync/` details

| Path | Purpose |
|------|---------|
| `.oat/sync/manifest.json` | Records sync-managed provider entries and drift contract state |
| `.oat/sync/config.json` | Sync behavior config (default strategy + provider-level settings) |

`config.json` currently includes:

- `version`
- `defaultStrategy`
- `providers.<provider>.enabled`
- `providers.<provider>.strategy` (optional override)

Primary ways this file is managed:

- `oat init --scope project` (interactive provider selection)
- `oat providers set --scope project --enabled ... --disabled ...`

## Config ownership (current)

Current config ownership:

- `.oat/config.json` owns shared non-sync repo settings (including `worktrees.root` and `projects.root`).
- `.oat/config.local.json` owns per-developer project lifecycle state (`activeProject`, `lastPausedProject`).
- `.oat/sync/config.json` continues to own sync/provider behavior.
- `.oat/active-idea` remains pointer-file based (idea migration is separate scope).

Legacy `.oat/active-project` / `.oat/projects-root` files may still be present in some environments but are no longer the canonical source in migrated command paths.

### `.oat/config.json` schema

Current schema keys:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `version` | `number` | `1` | Schema version |
| `worktrees.root` | `string` | `".worktrees"` | Root directory for git worktrees (repo-relative or absolute) |
| `projects.root` | `string` | `".oat/projects/shared"` | Default root directory for OAT projects |

Example:

```json
{
  "version": 1,
  "projects": {
    "root": ".oat/projects/shared"
  },
  "worktrees": {
    "root": ".worktrees"
  }
}
```

### Worktree root precedence

When resolving the worktree root directory, `oat-worktree-bootstrap` uses this strict precedence (stops at the first match):

1. **`--path <root>` flag** — Explicit CLI override (highest priority)
2. **`OAT_WORKTREES_ROOT` env var** — Environment-level override
3. **`.oat/config.json` `worktrees.root`** — Persisted project config
4. **First existing directory** (checked in order):
   - `<repo>/.worktrees`
   - `<repo>/worktrees`
   - `../<repo-name>-worktrees`
5. **Fallback default** — `../<repo-name>-worktrees`

For repo-relative values (levels 3-4), paths are resolved from the repository root. If the resolved root is project-local (`.worktrees` or `worktrees`), the skill verifies it is git-ignored before creating new worktrees.

## Project artifact structure

Each OAT project lives under:

- `.oat/projects/shared/<project>/`
- `.oat/projects/local/<project>/`
- `.oat/projects/archived/<project>/`

Typical contents:

```text
<project>/
  state.md
  discovery.md
  spec.md
  design.md
  plan.md
  implementation.md
  reviews/
  pr/
  references/
```

### Core artifact roles

| File | Purpose |
|------|---------|
| `state.md` | Lifecycle routing state (`oat_phase`, status, current task pointers) |
| `discovery.md` | Problem framing and requirements discovery notes |
| `spec.md` | Formalized requirements |
| `design.md` | Technical architecture/design decisions |
| `plan.md` | Executable task/phase plan and review table |
| `implementation.md` | Execution log, progress table, outcomes, verification history |
| `reviews/*.md` | Review artifacts from review skills |
| `pr/*.md` | PR description artifacts |
| `references/*` | Imported or supporting source material |

Not all workflow modes require every artifact:

- `spec-driven`: discovery + spec + design + plan + implementation
- `quick`: discovery + plan + implementation (spec/design optional)
- `import`: imported plan + implementation (spec/design optional)

## `.oat/repo/` structure

| Path | Purpose |
|------|---------|
| `.oat/repo/knowledge/` | Generated codebase knowledge indexes |
| `.oat/repo/reference/` | Repo-level reference docs (backlog, external plans, etc.) |
| `.oat/repo/reviews/` | Repo-scoped review artifacts (ad-hoc/non-project) |
| `.oat/repo/archive/` | Archived repo-level artifacts |

## User scope (`~/.oat/`)

Common user-scope entries:

```text
~/.oat/
  ideas/
  active-idea
  sync/
    manifest.json
```

User scope is primarily for:

- User-level ideas
- User-level provider sync state where applicable

## Practical guidance

- Treat `.oat/templates/` as scaffolding source.
- Treat `.oat/config.json` + `.oat/config.local.json` as OAT runtime config/state (`oat config get/set/list` is the preferred interface).
- Treat `.oat/sync/manifest.json` and `.oat/sync/config.json` as sync runtime state/config.
- Treat project artifacts under `.oat/projects/**` as lifecycle source-of-truth for workflow execution.
- Keep `state.md`, `plan.md`, and `implementation.md` consistent after each workflow step.
