---
title: Provider Interop CLI Scope and Surface
description: 'Scope boundaries and design principles for canonical-to-provider asset management.'
---

# Provider Interop CLI Scope and Surface

The provider interop CLI in `packages/cli` manages canonical agent assets under `.agents/` and reconciles provider-specific views.

This capability is intentionally independent from OAT workflow artifacts. Teams can adopt provider interoperability usage (`status`, `sync`, `providers ...`) plus optional project-scoped instruction sync integrity checks (`instructions validate/sync`) without using discovery/spec/design/plan/implement project workflows.

## Scope

- Canonical directories: `.agents/skills`, `.agents/agents`, `.agents/rules`
- Managed provider views: `.claude/*`, `.cursor/*`, `.github/*`, `.copilot/*`, `.codex/*` (where applicable)
- Native-read mappings use canonical `.agents/*` directly without mirrored provider directories. Cursor and Copilot skills, Gemini skills and agents, and Codex canonical mappings use this model.
- Cursor's `.cursor/skills` and `~/.cursor/skills` directories are provider-local extension and adoption surfaces, not managed output directories.
- Copilot's legacy `.github/skills` and `~/.copilot/skills` directories are adoption sources, not managed output directories. Copilot agents and project rules still use `.github/agents`, `~/.copilot/agents`, and `.github/instructions` provider views.
- Manifest tracking: `.oat/sync/manifest.json` (project) and `~/.oat/sync/manifest.json` (user)

Rules are currently project-scoped canonical content. Unlike skills and agents, synced rule files for Claude, Cursor, and Copilot are rendered copies with provider-specific frontmatter and filename extensions.

## Design principles

- Mutate by default; `--dry-run` to preview
- Explicit `--dry-run` for safe preview of mutations
- Scoped destructive actions only for manifest-tracked entries
- Cross-provider compatibility via adapters
- Native-read assets stay canonical while provider-local adoption sources remain discoverable independently
- Obsolete managed mappings are deleted only when their provider paths are verified clean; changed or unverified paths are preserved and detached from manifest ownership
- Canonical `.agents/agents` is source of truth for subagents; provider views are derived
- Canonical `.agents/rules` is source of truth for rules; provider rule files are derived rendered copies

## Implemented command surface

- `oat status`
- `oat sync`
- `oat providers list`
- `oat providers inspect`
- `oat providers set`
- `oat providers codex materialize`

## Adjacent CLI commands (commonly used with provider interop)

- `oat init` (bootstrap canonical structure and sync config) — see `../cli-utilities/bootstrap.md`
- `oat tools ...` (install/update/remove/list/inspect tools) — see `../cli-utilities/tool-packs.md`
- `oat doctor` (environment + skill-version diagnostics) — see `../reference/cli-reference.md`

## Provider enablement model

- Project provider enablement is stored in `.oat/sync/config.json` (`providers.<name>.enabled`).
- `oat init --scope project` (interactive) prompts for supported providers and persists explicit true/false values.
- `oat sync --scope project` uses config-aware provider activation and can prompt to remediate detected mismatches.
- Cursor provider enablement still controls agents, rules, migration discovery, and legacy cleanup even though Cursor reads canonical skills without a generated skill view.
- Copilot provider enablement still controls agents, project rules, migration discovery, and legacy cleanup even though Copilot reads canonical skills without a generated skill view.
- Codex project-scope subagent sync writes `.codex/config.toml` and `.codex/agents/*.toml` at command layer after path-mapping sync. Every generated project Codex variant and registration is repository-owned, version-controlled provider output. OAT provides no automatic ignore mechanism for this project output; collaborators review and commit it like other project configuration.
- Default Codex execution requires `root (0) → phase implementer (1)`. Sync and direct materialization continue to apply an `agents.max_depth` floor of `2` as optional nested-work capability without lowering a higher target value. A project write may read a higher lower-precedence user value and preserves it in project configuration; it writes only project `.codex/config.toml`. User scope writes only `~/.codex/config.toml` and does not read or change project configuration.
- Missing depth or depth `1` does not block default phase execution. Invalid values or explicit values below `1` fail managed implementation preflight. `oat doctor` reports whether optional depth-two nesting is available and gives a scope-specific repair when the configured value is unusable.
- Codex aggregate config drift is reported via sync/status extension metadata (`aggregateConfigHash`); it is not persisted as a separate manifest schema entry.
- Codex user-config materialization writes user-owned implementer and reviewer roles under the user provider directory, `~/.codex`; it does not write those roles into the repository.

## Codex managed dispatch

For managed Codex work, the resolver-returned materialized role is attempted as
the native `agent_type` first. The launcher owns the resulting target, model,
and reasoning-effort provenance, derived from the resolved candidate and
compiled invocation payload; worker output cannot populate or overwrite it.
A fresh pinned child is allowed only after explicit pre-start native
role-selection rejection. Missing runtime telemetry, missing self-report, or a
child accepted by the native route that later returns `BLOCKED` are not
role-selection rejection and do not permit fallback.

## Non-interop namespaces in the same CLI

- `oat project new <name>` (workflow/project scaffolding)
- `oat instructions validate` / `oat instructions sync` (AGENTS.md/CLAUDE.md pointer, symlink, or copy integrity plus Claude-only adoption)
- `oat internal validate-oat-skills` (internal maintenance)

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
