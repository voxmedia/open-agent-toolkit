---
title: Config and Local State
description: Utility command groups for config discovery, backlog helpers, local paths, instruction integrity, and diagnostics.
---

# Config and Local State

This page covers the general-purpose OAT command groups that support configuration discovery, local-only state, backlog maintenance, instruction integrity, and diagnostics.

Use these commands when you need operational support around the toolkit rather than one of the deeper product lanes.

## `oat backlog ...`

Use the `oat backlog` group when you want direct CLI support for the file-backed backlog under `.oat/repo/reference/backlog/`.

- `oat backlog init` - scaffold `.oat/repo/reference/backlog/` with starter files and directories for a fresh repo
- `oat backlog generate-id <filename>` - generate a unique backlog ID from a filename seed
- `oat backlog generate-id <filename> --created-at <timestamp>` - generate a reproducible ID for a known creation timestamp
- `oat backlog regenerate-index` - rebuild the managed backlog index table from item frontmatter

Run `oat backlog init` first when the local backlog scaffold does not exist yet in a fresh repo. This command group is primarily used by the `oat-pjm-*` project-management skills, but it is also available directly when you need to inspect or repair backlog metadata by hand.

## `oat local ...`

`oat local` manages local-only, gitignored paths that still need to follow you between the main repo and worktrees.

Common examples:

- `.oat/ideas/`
- `.oat/**/reviews/archived/`

Available commands:

- `oat local status` - show whether configured local paths exist and are gitignored
- `oat local apply` - write the managed `.gitignore` section for configured paths
- `oat local sync` - copy local paths between the main repo and a worktree
- `oat local add` / `oat local remove` - maintain the `localPaths` config entries

Use this when you want archived review history or idea scratchpads to persist locally without being committed.

## `oat config ...`

Use `oat config` for repo runtime config inspection and supported key mutation.

- `oat config get <key>` - read one resolved config value
- `oat config set <key> <value>` - update a supported shared or repo-local key
- `oat config list` - show the resolved command-surface values with source information
- `oat config describe` - list supported config surfaces and keys across shared repo, repo-local, user, and sync/provider config
- `oat config describe <key>` - show file location, scope, default, mutability, and owning command for one key

Archive lifecycle settings live here as shared repo config:

- `archive.s3Uri`
- `archive.s3SyncOnComplete`
- `archive.summaryExportPath`

Tool-pack installation state also lives here as shared repo config:

- `tools.core`
- `tools.docs`
- `tools.ideas`
- `tools.project-management`
- `tools.research`
- `tools.utility`
- `tools.workflows`

Use `oat config get tools.<pack>` when you need an explicit installed-capability signal for workflows or troubleshooting.

When archive settings are configured, completion uploads dated archive snapshots to S3 and exports dated summary snapshots into the configured summary reference directory.

Use these reference pages for file ownership and schema details:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)
- [Sync Config (`.oat/sync/config.json`)](../provider-sync/config.md)

## `oat instructions ...`

These commands validate and repair pointer integrity between `AGENTS.md` and sibling `CLAUDE.md` files.

- `oat instructions validate` - read-only integrity check
- `oat instructions sync` - preview or apply pointer repairs

Use this command group when instruction files drift after manual edits or generated updates.

## Repo state helpers

- `oat state refresh` - rebuild the `.oat/state.md` dashboard for the repo
- `oat index init` - generate a lightweight `project-index.md` for orientation

## Internal helpers and diagnostics

- `oat internal validate-oat-skills` - validate `oat-*` skill contracts and metadata
- `oat doctor` - run environment and setup diagnostics, including installed-vs-bundled skill version checks

`oat doctor` is the quickest way to confirm that your runtime, directory structure, and installed OAT assets are healthy before deeper debugging. The `/oat-doctor` skill (installed via the core pack) provides richer diagnostics with check and summary modes, including config explanations sourced from bundled documentation.
