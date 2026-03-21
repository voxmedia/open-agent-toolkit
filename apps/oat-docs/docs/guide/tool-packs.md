---
title: Tool Packs and Installed Assets
description: 'Tool-pack lifecycle commands (oat tools) for installing, updating, and removing skills.'
---

# Tool Packs and Installed Assets

This page covers CLI commands that manage bundled OAT tool packs and installed OAT skill/agent assets in canonical directories.

## Bundled packs at a glance

- `core` - foundational diagnostics and docs access (`oat-doctor`, `oat-docs`)
- `docs` - docs and agent-instructions governance workflows
- `workflows` - project lifecycle skills, reviewer agents, and core project templates
- `ideas` - lightweight ideation and promotion flows
- `utility` - review and repo-maintenance helpers
- `project-management` - file-backed backlog/reference skills plus backlog and roadmap templates
- `research` - research, analysis, comparison, and synthesis skills

## `oat tools` command group

The `oat tools` command group provides a unified interface for managing installed tools (skills and agents) across scopes.

### `oat tools list`

Purpose:

- List all installed tools with version, pack membership, scope, and update status

Key behavior:

- Scans installed skills and agents across project and user scopes
- Displays version, pack (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`, `custom`), and status (`current`, `outdated`, `newer`, `not-bundled`)
- Supports `--scope` filtering and `--json` output

### `oat tools outdated`

Purpose:

- Show only tools that have available updates (status `outdated`)

Key behavior:

- Filters scan results to tools where the installed version is older than the bundled version
- Displays installed and available versions side by side
- Supports `--scope` filtering and `--json` output

### `oat tools info <name>`

Purpose:

- Show detailed information about a single installed tool

Key behavior:

- Displays name, type (skill/agent), version, bundled version, pack, scope, and status
- Reports whether the tool is invocable (for skills) and whether an update is available
- Returns exit code 1 if the tool is not found in any scope

### `oat tools install`

Purpose:

- Install bundled OAT tool packs (`core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`)

Key behavior:

- Same pack selection and install flow as `oat init tools`
- Pack-oriented install subcommands: `core`, `docs`, `ideas`, `workflows`, `utility`, `project-management`, `research`
- Tracks installed vs bundled skill versions and reports outdated skills
- Interactive runs can prompt to update selected outdated skills
- Auto-sync runs automatically after successful install (provider views are updated)
- Use `--no-sync` to skip auto-sync

### `oat tools update`

Purpose:

- Update installed tools to the latest bundled versions

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- Compares installed versions against bundled versions and copies updated assets
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync
- Reports tools that are already current, newer than bundled, or not bundled (custom)

### `oat tools remove`

Purpose:

- Remove installed tools (skills and agents)

Key behavior:

- Accepts a tool name, `--pack <pack>`, or `--all` (mutually exclusive)
- Removes skill directories and agent `.md` files from canonical locations
- Dry-run mode with `--dry-run`; auto-sync after mutations by default
- Use `--no-sync` to skip auto-sync

## Core pack

The `core` pack contains foundational diagnostic and documentation skills:

- **oat-doctor** — Setup diagnostics with two modes: check mode (terse `brew doctor`-style warnings with fix commands) and summary mode (full dashboard of installed packs, config values, and sync status).
- **oat-docs** — Interactive Q&A skill backed by locally-bundled OAT documentation at `~/.oat/docs/`.

Key behavior:

- Core pack always installs at **user scope** (`~/.agents/skills/`), regardless of the `--scope` flag. This ensures core skills are available in any directory.
- Core is checked by default in the `oat init tools` guided setup.
- Installation also bundles OAT documentation to `~/.oat/docs/` for the oat-docs skill.
- `oat tools update --pack core` refreshes both skills and `~/.oat/docs/` documentation.

## Docs pack

The `docs` pack contains active documentation and instruction-governance
workflows:

- **oat-docs-analyze** — Analyze a docs surface for contract coverage, nav
  drift, stale claims, and coverage gaps.
- **oat-docs-apply** — Apply only approved, evidence-backed docs-analysis
  recommendations.
- **oat-agent-instructions-analyze** — Evaluate `AGENTS.md` and provider
  instruction coverage, quality, and drift.
- **oat-agent-instructions-apply** — Generate or update approved instruction
  files from an analysis artifact.

Key behavior:

- Docs pack installs at the selected scope, typically `project`.
- It complements the `core` pack: `oat-docs` answers questions from bundled
  docs, while the `docs` pack adds analyze/apply workflows.
- `oat tools install docs` is the preferred install path; `oat init tools docs`
  remains available for backward compatibility.
- `oat tools update --pack docs` and `oat tools remove --pack docs` manage the
  workflow skills as a unit.

### Auto-sync behavior

All mutation commands (`install`, `update`, `remove`) automatically run `oat sync --scope <scope>` after successful operations. This ensures provider views stay in sync with canonical assets without manual intervention.

Use `--no-sync` on any mutation command to skip this step.

## Legacy commands

### `oat init tools`

The `oat init tools` command remains available for backward compatibility. It has the same install behavior as `oat tools install` but does not include auto-sync — you must run `oat sync --scope ...` manually after install.

### `oat remove`

The `oat remove` command group remains available for backward compatibility. It provides skill removal with dry-run/apply semantics and managed provider-view cleanup.

- `oat remove skill <name>` — remove one installed skill by name
- `oat remove skills --pack <pack>` — remove all installed skills from a bundled pack

These commands mutate by default; use `--dry-run` to preview deletions.

Related docs:

- Bootstrap (`oat init`): `getting-started.md`
- Provider sync (`oat status`, `oat sync`, `oat providers ...`): `provider-sync/index.md`
- Diagnostics and local-state commands: `cli-reference.md`
