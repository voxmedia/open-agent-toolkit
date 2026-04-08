---
title: Configuration
description: 'How OAT configuration is split across shared repo, repo-local, user, and provider-sync surfaces.'
---

# Configuration

Use this guide when you need to answer two questions quickly:

1. Which config file owns a setting?
2. Which CLI command should I use to inspect or change it?

For the deep file-by-file reference, see:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)
- [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md)

## The four config surfaces

| Surface              | File                     | Typical contents                                                                                                        | Primary CLI surface                        |
| -------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Shared repo config   | `.oat/config.json`       | Repo-wide non-sync settings such as `projects.root`, `git.defaultBranch`, `documentation.*`, `archive.*`, and `tools.*` | `oat config get/set/list/describe`         |
| Repo-local config    | `.oat/config.local.json` | Per-developer state for this checkout, such as `activeProject`, `lastPausedProject`, and repo-local `activeIdea`        | `oat config get/set/list/describe`         |
| User config          | `~/.oat/config.json`     | User-level state such as global `activeIdea` fallback                                                                   | `oat config describe`                      |
| Provider sync config | `.oat/sync/config.json`  | Provider enablement and sync strategy settings                                                                          | `oat providers set`, `oat config describe` |

The main split is:

- `.oat/config.json` for shared repo behavior
- `.oat/config.local.json` for local developer state
- `~/.oat/config.json` for user-scope fallback state
- `.oat/sync/config.json` for provider sync only

## The fastest way to inspect config

Use `oat config` as the primary discovery surface:

```bash
oat config list
oat config get projects.root
oat config describe
oat config describe archive.s3Uri
oat config describe sync.providers.github.enabled
```

What each command is for:

- `oat config list` shows the currently resolved command-surface values for shared and repo-local keys.
- `oat config get <key>` reads one supported key value.
- `oat config set <key> <value>` updates supported shared or repo-local keys.
- `oat config describe` shows the supported config catalog across shared repo, repo-local, user, and sync/provider surfaces.
- `oat config describe <key>` shows file, scope, default, mutability, owning command, and description for one key.

## Shared repo config you will touch most often

Common keys in `.oat/config.json`:

- `projects.root` — where tracked projects live
- `worktrees.root` — where OAT-managed worktrees live
- `git.defaultBranch` — base branch fallback for PR workflows
- `documentation.root`, `documentation.tooling`, `documentation.config` — docs-surface ownership
- `documentation.requireForProjectCompletion` — whether docs sync is a completion gate
- `archive.s3Uri` — base S3 archive prefix
- `archive.s3SyncOnComplete` — upload archived projects to S3 during completion
- `archive.summaryExportPath` — export `summary.md` into a durable tracked directory during completion
- `tools.<pack>` — whether a bundled tool pack is currently installed in the repo or user scopes after lifecycle reconciliation

Tool-pack state example:

```bash
oat config get tools.project-management
oat config set tools.project-management true
```

The `tools.*` keys are primarily maintained by `oat tools install`, `oat tools update`, and `oat tools remove`, but they are intentionally visible through `oat config` so workflows and operators can inspect or override pack-state signals when needed.

Archive example:

```bash
oat config set archive.s3Uri s3://example-bucket/oat-archive
oat config set archive.s3SyncOnComplete true
oat config set archive.summaryExportPath .oat/repo/reference/project-summaries
```

With those values configured:

- `oat-project-complete` still archives locally into `.oat/projects/archived/<project>/`
- completion also attempts an S3 upload when AWS CLI is available and configured, storing dated snapshots such as `<archive.s3Uri>/<repo-slug>/projects/20260401-my-project/`
- completion also copies `summary.md` into `<archive.summaryExportPath>/20260401-my-project.md`
- `oat project archive sync` can later pull archive data back down from S3 and materialize the latest snapshot into the local bare archive path `.oat/projects/archived/<project>/`

## Repo-local and user state

Use `.oat/config.local.json` for checkout-specific workflow state:

- `activeProject`
- `lastPausedProject`
- repo-scoped `activeIdea`

Use `~/.oat/config.json` for user fallback state when no repo-local value is set:

- `activeIdea`

In practice, you usually inspect these via:

```bash
oat config get activeProject
oat config get lastPausedProject
oat config describe activeIdea
```

## Provider sync config is different

Provider sync settings are intentionally documented in the same discovery flow, but they are not owned by `oat config set`.

Examples:

```bash
oat config describe sync.defaultStrategy
oat config describe sync.providers.<name>.enabled
oat providers set --scope project --enabled claude,codex
```

Use:

- `oat config describe ...` to understand sync keys
- `oat providers set ...` to mutate sync/provider settings

For the provider-sync schema details, use [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md).

## Recommended workflow

When you are unsure where a setting lives:

1. Run `oat config describe`.
2. Run `oat config describe <key>` for the key you care about.
3. Use the owning command shown there.

That keeps config discovery centralized without forcing you to remember which settings belong to workflow state versus provider sync.
