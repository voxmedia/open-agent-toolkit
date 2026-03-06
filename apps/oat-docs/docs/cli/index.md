# CLI Docs

This section documents the OAT CLI.

The CLI is a standalone value path: you can use it without adopting OAT workflow artifacts or lifecycle skills.

## Contents

- [Design Principles](design-principles.md) — Cross-cutting CLI design and implementation conventions.
- [Bootstrap](bootstrap.md) — Foundational CLI setup (`oat init`).
- [Docs App Commands](docs-apps.md) — Docs app bootstrap, nav sync, and docs workflow entrypoints.
- [Tool Packs and Assets](tool-packs-and-assets.md) — OAT tool-pack install, update, and remove lifecycle.
- [Diagnostics](diagnostics.md) — Cross-cutting diagnostics (`oat doctor`).
- [Provider Interop](provider-interop/index.md) — Provider-interop command surface and behavior.

## Command Groups

### Bootstrap Commands

| Command    | Purpose                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `oat init` | Initialize canonical directories, sync config/manifest, and optional setup hooks. Sets up the base OAT structure for a scope. |

See [`bootstrap.md`](bootstrap.md) for details.

### Docs App Commands

| Command             | Purpose                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `oat docs init`     | Scaffold a new MkDocs Material docs app with OAT defaults and repo-shape-aware placement. |
| `oat docs nav sync` | Regenerate `mkdocs.yml` navigation from `index.md` `## Contents` sections.                |
| `oat docs analyze`  | Guidance entrypoint for the docs analysis skill workflow.                                 |
| `oat docs apply`    | Guidance entrypoint for the docs apply skill workflow.                                    |

See [`docs-apps.md`](docs-apps.md) for details.

### Tool Packs and Installed Assets

| Command          | Purpose                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `oat init tools` | Install OAT tool packs (`ideas`, `workflows`, `utility`) with version-aware outdated-skill reporting and interactive update prompts in TTY mode. |
| `oat remove`     | Remove installed skills or packs (`remove skill`, `remove skills --pack`) with dry-run by default and managed provider-view cleanup on apply.    |

See [`tool-packs-and-assets.md`](tool-packs-and-assets.md) for details.

### Instruction Integrity Commands

| Command                     | Purpose                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `oat instructions`          | Validate and repair AGENTS.md to CLAUDE.md pointer integrity. Includes `validate` (read-only) and `sync` (dry-run/apply).                |
| `oat instructions validate` | Read-only integrity check for AGENTS.md sibling CLAUDE.md pointer files. Returns non-zero when missing or mismatched pointers are found. |
| `oat instructions sync`     | Plan/apply pointer repairs. Dry-run by default; use `--apply` to write and `--force` to overwrite mismatched CLAUDE.md content.          |

### Provider-Interop Commands

| Command                 | Purpose                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `oat status`            | Report provider sync and drift status. Shows which skills are in sync, drifted, or missing across providers.       |
| `oat sync`              | Sync canonical content to provider views. Use `--apply` to execute the sync plan.                                  |
| `oat providers`         | Inspect provider capabilities and paths. Lists registered providers and their configuration.                       |
| `oat providers set`     | Set provider enable/disable state for a scope. See [`provider-interop/commands.md`](provider-interop/commands.md). |
| `oat providers inspect` | Inspect a specific provider's paths, capabilities, and sync state.                                                 |
| `oat providers list`    | List all registered providers with their enabled/disabled status.                                                  |

See [`provider-interop/`](provider-interop/index.md) for detailed provider-interop documentation.

### Diagnostics

| Command      | Purpose                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `oat doctor` | Run environment and setup diagnostics, including bundled-vs-installed OAT skill version checks with `oat init tools` remediation guidance. |

See [`diagnostics.md`](diagnostics.md) for details.

### Project Lifecycle Commands

| Command                       | Purpose                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `oat project new <name>`      | Mode-aware project scaffolding (`--mode spec-driven\|quick\|import`). Creates project directories and template files. |
| `oat project set-mode <mode>` | Set project implementation mode (`single-thread` or `subagent-driven`) in active project `state.md`.                  |
| `oat cleanup project`         | Project-state hygiene cleanup (pointer/state/lifecycle drift). Dry-run by default.                                    |
| `oat cleanup artifacts`       | Review/reference artifact hygiene cleanup with duplicate pruning and stale triage.                                    |

### Repo State and Index Commands

| Command             | Purpose                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `oat state refresh` | Regenerate the OAT repo state dashboard (`.oat/state.md`). Scans projects, computes status, and writes a summary view.                                             |
| `oat index init`    | Generate a thin `project-index.md` for quick repo orientation. Produces a lightweight index of key files and structure. Options: `--head-sha`, `--merge-base-sha`. |

### Internal Commands

| Command                            | Purpose                                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `oat internal validate-oat-skills` | Validate `oat-*` skill contracts (frontmatter, naming, required fields). Primary invocation: `pnpm oat:validate-skills`. |

## Global Options

All commands support these global options:

| Option            | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| `--json`          | Output a single JSON document                                    |
| `--verbose`       | Enable verbose debug output                                      |
| `--scope <scope>` | Limit execution scope (`project`, `user`, `all`; default: `all`) |
| `--cwd <path>`    | Override working directory                                       |
