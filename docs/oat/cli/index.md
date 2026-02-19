# CLI Docs

This section documents the OAT CLI.

The CLI is a standalone value path: you can use it without adopting OAT workflow artifacts or lifecycle skills.

## Contents

- [`design-principles.md`](design-principles.md) — Cross-cutting CLI design and implementation conventions.
- [`provider-interop/index.md`](provider-interop/index.md) — Provider-interop command surface and behavior.

## Command Groups

### Core Commands

| Command | Purpose |
|---------|---------|
| `oat init` | Initialize canonical directories, manifest, and tool packs. Sets up `.agents/skills/`, provider views, and the sync manifest. |
| `oat status` | Report provider sync and drift status. Shows which skills are in sync, drifted, or missing across providers. |
| `oat sync` | Sync canonical content to provider views. Use `--apply` to execute the sync plan. |
| `oat doctor` | Run environment and setup diagnostics. Checks Node version, pnpm availability, directory structure, and manifest health. |

### Provider-Interop Commands

| Command | Purpose |
|---------|---------|
| `oat providers` | Inspect provider capabilities and paths. Lists registered providers and their configuration. |
| `oat providers set` | Set provider enable/disable state for a scope. See [`provider-interop/commands.md`](provider-interop/commands.md). |
| `oat providers inspect` | Inspect a specific provider's paths, capabilities, and sync state. |
| `oat providers list` | List all registered providers with their enabled/disabled status. |

See [`provider-interop/`](provider-interop/index.md) for detailed provider-interop documentation.

### Project Lifecycle Commands

| Command | Purpose |
|---------|---------|
| `oat project new <name>` | Mode-aware project scaffolding (`--mode full\|quick\|import`). Creates project directories and template files. |
| `oat cleanup project` | Project-state hygiene cleanup (pointer/state/lifecycle drift). Dry-run by default. |
| `oat cleanup artifacts` | Review/reference artifact hygiene cleanup with duplicate pruning and stale triage. |

### Repo State and Index Commands

| Command | Purpose |
|---------|---------|
| `oat state refresh` | Regenerate the OAT repo state dashboard (`.oat/state.md`). Scans projects, computes status, and writes a summary view. |
| `oat index init` | Generate a thin `project-index.md` for quick repo orientation. Produces a lightweight index of key files and structure. Options: `--head-sha`, `--merge-base-sha`. |

### Internal Commands

| Command | Purpose |
|---------|---------|
| `oat internal validate-oat-skills` | Validate `oat-*` skill contracts (frontmatter, naming, required fields). Primary invocation: `pnpm oat:validate-skills`. |

## Global Options

All commands support these global options:

| Option | Description |
|--------|-------------|
| `--json` | Output a single JSON document |
| `--verbose` | Enable verbose debug output |
| `--scope <scope>` | Limit execution scope (`project`, `user`, `all`; default: `all`) |
| `--cwd <path>` | Override working directory |
