# Provider Interop CLI Scope and Surface

The provider interop CLI in `packages/cli` manages canonical agent assets under `.agents/` and reconciles provider-specific views.

This capability is intentionally independent from OAT workflow artifacts. Teams can adopt provider interoperability usage (`status`, `sync`, `providers ...`) plus optional instruction-pointer integrity checks (`instructions validate/sync`) without using discovery/spec/design/plan/implement project workflows.

## Scope

- Canonical directories: `.agents/skills`, `.agents/agents`
- Managed provider views: `.claude/*`, `.cursor/*`, `.github/*`, `.copilot/*`, `.codex/*` (where applicable)
- Native-read providers may use canonical `.agents/*` directly without mirrored provider directories (for example, Gemini and Codex canonical mappings)
- Manifest tracking: `.oat/sync/manifest.json` (project) and `~/.oat/sync/manifest.json` (user)

## Design principles

- Dry-run first
- Explicit apply for mutation
- Scoped destructive actions only for manifest-tracked entries
- Cross-provider compatibility via adapters
- Canonical `.agents/agents` is source of truth for subagents; provider views are derived

## Implemented command surface

- `oat status`
- `oat sync`
- `oat providers list`
- `oat providers inspect`
- `oat providers set`

## Adjacent CLI commands (commonly used with provider interop)

- `oat init` (bootstrap canonical structure and sync config) — see `../bootstrap.md`
- `oat tools ...` (install/update/remove/list/inspect tools) — see `../tool-packs-and-assets.md`
- `oat doctor` (environment + skill-version diagnostics) — see `../diagnostics.md`

## Provider enablement model

- Project provider enablement is stored in `.oat/sync/config.json` (`providers.<name>.enabled`).
- `oat init --scope project` (interactive) prompts for supported providers and persists explicit true/false values.
- `oat sync --scope project` uses config-aware provider activation and can prompt to remediate detected mismatches.
- Codex project-scope subagent sync is generated output (`.codex/agents/*.toml` + `.codex/config.toml`) computed at command layer after path-mapping sync.
- Codex aggregate config drift is reported via sync/status extension metadata (`aggregateConfigHash`); it is not persisted as a separate manifest schema entry.
- Codex user-scope role generation remains intentionally deferred in this release.

## Non-interop namespaces in the same CLI

- `oat project new <name>` (workflow/project scaffolding)
- `oat instructions validate` / `oat instructions sync` (AGENTS.md to CLAUDE.md pointer integrity)
- `oat internal validate-oat-skills` (internal maintenance)

## Reference artifacts

- `.oat/projects/<scope>/<project>/spec.md`
- `.oat/projects/<scope>/<project>/design.md`
- `.oat/projects/<scope>/<project>/plan.md`
- `.oat/projects/<scope>/<project>/implementation.md`
