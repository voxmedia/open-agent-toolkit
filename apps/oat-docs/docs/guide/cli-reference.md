---
title: CLI Reference
description: 'Scannable reference for the current OAT CLI surface, with links to the deeper guide pages for each command family.'
---

# CLI Reference

Use this page when you need a quick map of the OAT CLI rather than the full command-by-command docs. It is intentionally shallow: each section points to the guide page that owns the detailed behavior.

The CLI is also a standalone value path. You can use `oat init`, `oat sync`, `oat tools`, docs commands, and repo-analysis commands without adopting the full project workflow.

## Contents

- [Getting Started](getting-started.md) - Bootstrap a repo with `oat init`, guided setup, and initial provider adoption.
- [Tool Packs](tool-packs.md) - Install, update, inspect, and remove bundled OAT skills and agents.
- [Documentation Commands](documentation/commands.md) - Docs app scaffolding, migration, index generation, and nav sync.
- [Provider Sync](provider-sync/index.md) - Sync behavior, provider capabilities, config, and drift management.
- [Workflow & Projects](workflow/index.md) - Project lifecycle, artifacts, reviews, PR flow, and state-machine docs.
- [Repository Analysis](workflow/repo-analysis.md) - Detailed `oat repo pr-comments ...` behavior.

## Command Groups

| Command group                                          | What it covers                                                                            | Go deeper                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `oat init`                                             | Bootstrap canonical OAT directories, sync config, optional hooks, and guided setup.       | [Getting Started](getting-started.md)               |
| `oat tools ...`                                        | Install, inspect, update, and remove bundled OAT tool packs and assets.                   | [Tool Packs](tool-packs.md)                         |
| `oat backlog ...`                                      | Generate backlog IDs and rebuild the managed file-backed backlog index.                   | See sections below                                  |
| `oat config ...`                                       | Inspect resolved config values, update supported keys, and discover config ownership.     | See sections below                                  |
| `oat docs ...`                                         | Docs app bootstrap, migration, index generation, nav sync, and docs workflow entrypoints. | [Documentation Commands](documentation/commands.md) |
| `oat status` / `oat sync` / `oat providers ...`        | Provider sync, drift inspection, provider configuration, and adoption behavior.           | [Provider Sync](provider-sync/index.md)             |
| `oat project ...` / `oat cleanup ...`                  | Project scaffolding, execution mode, and project/artifact cleanup commands.               | [Workflow & Projects](workflow/index.md)            |
| `oat repo ...`                                         | Repository-level analysis workflows, currently centered on PR comments.                   | [Repository Analysis](workflow/repo-analysis.md)    |
| `oat state ...` / `oat index ...` / `oat internal ...` | Repo dashboard refresh, repo indexing, and internal validation helpers.                   | See sections below                                  |

## Bootstrap and Setup

### `oat init`

Use `oat init` to establish the canonical OAT directory layout, sync config, provider manifest state, and optional setup hooks.

Key behavior:

- initializes project- or user-scope OAT directories idempotently
- can detect and adopt provider strays during setup
- supports guided setup for tool packs, local paths, and provider sync
- prepares the repo for later `oat status`, `oat sync`, `oat doctor`, and workflow usage

See [Getting Started](getting-started.md) for the full setup flow.

## Tool Management and Local State

### `oat tools ...`

Use the `oat tools` group to manage bundled OAT assets:

- `oat tools list` - list installed tools, versions, pack membership, and update state
- `oat tools info <name>` - inspect one installed skill or agent
- `oat tools outdated` - show only assets with available updates
- `oat tools install` - install bundled packs such as `core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, or `research`
- `oat tools update` - update a named tool, a whole pack, or everything
- `oat tools remove` - remove installed assets

Mutation commands auto-run provider sync unless you pass `--no-sync`.

See [Tool Packs](tool-packs.md) for the pack lifecycle and compatibility notes.

### `oat backlog ...`

Use the `oat backlog` group when you want direct CLI support for the file-backed backlog under `.oat/repo/reference/backlog/`.

- `oat backlog init` - scaffold `.oat/repo/reference/backlog/` with starter files and directories for a fresh repo
- `oat backlog generate-id <filename>` - generate a unique backlog ID from a filename seed
- `oat backlog generate-id <filename> --created-at <timestamp>` - generate a reproducible ID for a known creation timestamp
- `oat backlog regenerate-index` - rebuild the managed backlog index table from item frontmatter

Run `oat backlog init` first when the local backlog scaffold does not exist yet in a fresh repo. This command group is primarily used by the `oat-pjm-*` project-management skills, but it is also available directly when you need to inspect or repair backlog metadata by hand.

### `oat local ...`

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

### `oat config ...`

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

Use the reference pages for file ownership and schema details:

- [File Locations](../reference/file-locations.md)
- [`.oat` Directory Structure](../reference/oat-directory-structure.md)

## Instruction Integrity

### `oat instructions`

These commands validate and repair pointer integrity between `AGENTS.md` and sibling `CLAUDE.md` files.

- `oat instructions validate` - read-only integrity check
- `oat instructions sync` - preview or apply pointer repairs

Use this command group when instruction files drift after manual edits or generated updates.

## Docs Commands

### `oat docs ...`

The docs command group covers:

- `oat docs init` - scaffold a docs app for Fumadocs or MkDocs
- `oat docs migrate` - convert MkDocs markdown patterns to Fumadocs-friendly markdown
- `oat docs generate-index` - regenerate the generated app-root docs index
- `oat docs nav sync` - rebuild MkDocs navigation from `index.md` `## Contents`
- `oat docs analyze` / `oat docs apply` - CLI entrypoints for the docs workflow skills

See [Documentation Commands](documentation/commands.md) for framework-specific behavior and flags.

## Provider Sync Commands

### `oat status`, `oat sync`, and `oat providers ...`

These commands manage the relationship between canonical OAT assets and provider-specific views.

- `oat status` - inspect sync and drift state
- `oat sync` - write provider views from canonical assets
- `oat providers list` / `inspect` / `set` - inspect providers and control enablement

Use [Provider Sync](provider-sync/index.md) for the full model, including scope, manifest, config, and safety behavior.

## Workflow and Project Commands

### `oat project ...`

Project commands are the CLI entrypoint into the OAT lifecycle.

- `oat project new <name>` - create a new project in spec-driven, quick, or import mode
- `oat project open <name>` - activate an existing project
- `oat project set-mode <mode>` - switch implementation between `single-thread` and `subagent-driven`
- `oat project archive sync` - sync all repo archived projects from the configured S3 archive into `.oat/projects/archived/`
- `oat project archive sync <project-name>` - sync one archived project subtree from the configured S3 archive

### `oat cleanup ...`

Cleanup commands handle lifecycle drift and stale artifacts:

- `oat cleanup project` - reconcile project pointers and lifecycle state
- `oat cleanup artifacts` - prune duplicate or stale review/reference artifacts

Use [Workflow & Projects](workflow/index.md) for the full lifecycle map and related docs on artifacts, reviews, PR flow, and state transitions.

## Repository Analysis

### `oat repo ...`

The `oat repo` command group is for repository-wide analysis work rather than single-project execution.

- `oat repo pr-comments collect` - collect merged PR review comments into monthly artifacts
- `oat repo pr-comments triage-collection` - interactively keep or discard collected comments

See [Repository Analysis](workflow/repo-analysis.md) for the detailed collection, filtering, and triage workflow.

## Repo State and Internal Commands

### Repo state helpers

- `oat state refresh` - rebuild the `.oat/state.md` dashboard for the repo
- `oat index init` - generate a lightweight `project-index.md` for orientation

### Internal helpers

- `oat internal validate-oat-skills` - validate `oat-*` skill contracts and metadata
- `oat doctor` - run environment and setup diagnostics, including installed-vs-bundled skill version checks

`oat doctor` is the quickest way to confirm that your runtime, directory structure, and installed OAT assets are healthy before deeper debugging. The `/oat-doctor` skill (installed via the core pack) provides richer diagnostics with check and summary modes, including config explanations sourced from bundled documentation.

## Global Options

Most command groups support these global flags:

| Option            | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| `--json`          | Emit a single JSON document instead of human-readable output. |
| `--verbose`       | Enable debug-style logging.                                   |
| `--scope <scope>` | Limit work to `project`, `user`, or `all`.                    |
| `--cwd <path>`    | Override the working directory for the command.               |
