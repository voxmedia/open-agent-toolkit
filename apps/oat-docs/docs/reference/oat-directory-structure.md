---
title: '`.oat` Directory Structure'
description: 'Canonical .oat/ tree reference: config, projects, sync state, templates, and per-file purpose.'
---

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

| Path                     | Purpose                                          | Notes                                                                                                   |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `.oat/config.json`       | Shared repo runtime config for non-sync settings | Includes `worktrees.root`, `projects.root`, `git.defaultBranch`, `archive.*`, and `documentation.*`     |
| `.oat/config.local.json` | Local per-developer runtime state                | Gitignored; includes `activeProject`, `lastPausedProject`, `activeIdea`                                 |
| `.oat/projects/`         | OAT project artifacts                            | `shared`, `local`, `archived` scopes                                                                    |
| `.oat/ideas/`            | Project-level ideas store                        | Often gitignored                                                                                        |
| `.oat/sync/`             | Interop sync state/config                        | See details below                                                                                       |
| `.oat/templates/`        | Artifact templates used by OAT skills            | Source for scaffolding. Includes `docs-app-fuma/` (Fumadocs) and `docs-app-mkdocs/` (MkDocs) templates. |
| `.oat/repo/`             | Repo-level knowledge/reference/review artifacts  | Durable operational records                                                                             |

## `.oat/sync/` details

| Path                      | Purpose                                                           |
| ------------------------- | ----------------------------------------------------------------- |
| `.oat/sync/manifest.json` | Records sync-managed provider entries and drift contract state    |
| `.oat/sync/config.json`   | Sync behavior config (default strategy + provider-level settings) |

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

- `.oat/config.json` owns shared non-sync repo settings (including `worktrees.root`, `projects.root`, and `documentation.*`).
- `.oat/config.local.json` owns per-developer project lifecycle state (`activeProject`, `lastPausedProject`, `activeIdea`).
- `~/.oat/config.json` owns user-level state (`activeIdea` at global scope).
- `.oat/sync/config.json` continues to own sync/provider behavior.

CLI discovery surfaces:

- `oat config describe` lists the supported config surfaces and keys across shared repo, repo-local, user, and sync/provider config.
- `oat config describe <key>` prints scope, file, default, mutability, owning command, and description for one config key.
- `oat config list` prints the resolved values for the repo-scoped/local command surface.

Legacy `.oat/active-project` / `.oat/projects-root` / `.oat/active-idea` files may still be present in some environments but are no longer the canonical source in migrated command paths.

### `.oat/config.json` schema

Current schema keys:

| Key                                         | Type       | Default                  | Description                                                                                                                                                                               |
| ------------------------------------------- | ---------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                                   | `number`   | `1`                      | Schema version                                                                                                                                                                            |
| `worktrees.root`                            | `string`   | `".worktrees"`           | Root directory for git worktrees (repo-relative or absolute)                                                                                                                              |
| `projects.root`                             | `string`   | `".oat/projects/shared"` | Default root directory for OAT projects                                                                                                                                                   |
| `localPaths`                                | `string[]` | -                        | Gitignored directories to sync between main repo and worktrees. Supports glob patterns. Managed via `oat local add/remove`.                                                               |
| `documentation.root`                        | `string`   | -                        | Root directory containing documentation source files (e.g., `apps/docs/docs`)                                                                                                             |
| `documentation.tooling`                     | `string`   | -                        | Documentation framework identifier (`mkdocs` or `fumadocs`)                                                                                                                               |
| `documentation.config`                      | `string`   | -                        | Path to the documentation framework config file (e.g., `mkdocs.yml`, `next.config.js`)                                                                                                    |
| `documentation.index`                       | `string`   | -                        | Path to the docs surface entry point (e.g., `index.md` for Fumadocs, `mkdocs.yml` for MkDocs). Set by `oat docs init` and updated by `oat docs generate-index`.                           |
| `documentation.requireForProjectCompletion` | `boolean`  | `false`                  | When `true`, OAT project completion gates require documentation to be updated                                                                                                             |
| `git.defaultBranch`                         | `string`   | `"main"`                 | Default branch for PR creation. Auto-detected during `oat init` via `gh repo view` or `origin/HEAD`. Used by `oat-project-pr-final` and `oat-project-pr-progress`.                        |
| `autoReviewAtCheckpoints`                   | `boolean`  | `false`                  | When `true`, completing a plan phase checkpoint automatically spawns a subagent code review. Can be overridden per-project via `oat_auto_review_at_checkpoints` in `plan.md` frontmatter. |
| `archive.s3Uri`                             | `string`   | -                        | Base S3 URI for repo-scoped archived project sync, for example `s3://bucket/oat-archive`                                                                                                  |
| `archive.s3SyncOnComplete`                  | `boolean`  | `false`                  | When `true`, `oat-project-complete` uploads the archived project to the configured S3 archive after local archive succeeds                                                                |
| `archive.summaryExportPath`                 | `string`   | -                        | Repo-relative directory where completion exports `summary.md` as a dated snapshot like `20260401-<project-name>.md` for durable tracked reference                                         |

All `documentation.*` keys are managed via `oat config get/set` and are set automatically by `oat docs init`.
The `git.defaultBranch` key is auto-detected during `oat init` and can be overridden via `oat config set git.defaultBranch <branch>`.
Archive settings are managed via `oat config get/set`, and `oat config describe archive.s3Uri` (or the other archive keys) shows the lifecycle and ownership details from the CLI.

Example:

```json
{
  "version": 1,
  "projects": {
    "root": ".oat/projects/shared"
  },
  "worktrees": {
    "root": ".worktrees"
  },
  "documentation": {
    "root": "apps/docs/docs",
    "tooling": "mkdocs",
    "config": "mkdocs.yml",
    "requireForProjectCompletion": false
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

Archive sync behavior:

- `oat-project-complete` always archives locally into `.oat/projects/archived/<project>/`.
- If `archive.s3SyncOnComplete=true` and `archive.s3Uri` is configured, completion also uploads a dated snapshot such as `<archive.s3Uri>/<repo-slug>/projects/20260401-<project>/`.
- `oat project archive sync` syncs all repo archived projects down from S3 into `.oat/projects/archived/`.
- `oat project archive sync <project-name>` syncs the latest dated remote snapshot for a single project into `.oat/projects/archived/<project-name>/`.
- Default archive sync is non-destructive toward unrelated local-only archive data, but it does replace a local project archive when a newer dated remote snapshot is selected for that same project.

Typical contents:

```text
<project>/
  state.md
  discovery.md
  spec.md
  design.md
  plan.md
  implementation.md
  summary.md
  reviews/
  pr/
  references/
```

### Core artifact roles

| File                    | Purpose                                                                                                                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `state.md`              | Lifecycle routing state (`oat_phase`, status, current task pointers)                                                                                                                                                           |
| `discovery.md`          | Problem framing and requirements discovery notes                                                                                                                                                                               |
| `spec.md`               | Formalized requirements                                                                                                                                                                                                        |
| `design.md`             | Technical architecture/design decisions                                                                                                                                                                                        |
| `plan.md`               | Executable task/phase plan and review table                                                                                                                                                                                    |
| `implementation.md`     | Execution log, progress table, outcomes, verification history                                                                                                                                                                  |
| `summary.md`            | Institutional memory artifact — generated from project artifacts by `oat-project-summary`. Contains overview, key decisions, design deltas, challenges, follow-up items. Used as PR description source and archive cover page. |
| `reviews/*.md`          | Active tracked review artifacts awaiting receive/closeout                                                                                                                                                                      |
| `reviews/archived/*.md` | Local-only historical review artifacts after receive/closeout                                                                                                                                                                  |
| `pr/*.md`               | PR description artifacts                                                                                                                                                                                                       |
| `references/*`          | Imported or supporting source material                                                                                                                                                                                         |

Not all workflow modes require every artifact:

- `spec-driven`: discovery + spec + design + plan + implementation
- `quick`: discovery + plan + implementation (spec/design optional)
- `import`: imported plan + implementation (spec/design optional)

## `.oat/repo/` structure

| Path                   | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `.oat/repo/knowledge/` | Generated codebase knowledge indexes                      |
| `.oat/repo/reference/` | Repo-level reference docs (backlog, external plans, etc.) |
| `.oat/repo/reviews/`   | Repo-scoped review artifacts (ad-hoc/non-project)         |
| `.oat/repo/archive/`   | Archived repo-level artifacts                             |

## User scope (`~/.oat/`)

Common user-scope entries:

```text
~/.oat/
  config.json
  ideas/
  sync/
    manifest.json
```

User scope is primarily for:

- User-level ideas
- User-level provider sync state where applicable

## Practical guidance

- Treat `.oat/templates/` as scaffolding source.
- Treat `.oat/config.json` + `.oat/config.local.json` as OAT runtime config/state (`oat config get/set/list/describe` is the preferred interface).
- Treat `.oat/sync/manifest.json` and `.oat/sync/config.json` as sync runtime state/config.
- Treat project artifacts under `.oat/projects/**` as lifecycle source-of-truth for workflow execution.
- Keep `state.md`, `plan.md`, and `implementation.md` consistent after each workflow step.
