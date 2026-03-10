---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: a80661894616fc9323542a4bcbcc22c08917e440
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# External Integrations

**Analysis Date:** 2026-02-16

## APIs & External Services

**No External API Integrations:**

- OAT is self-contained with no outbound API calls to external services
- No third-party cloud services, SaaS APIs, or microservice dependencies
- Communication is limited to local filesystem operations and command execution

**Provider Integrations (Local):**

- Claude Code - File-based detection via `.claude` directory
  - SDK/Client: Direct filesystem access
  - Auth: None (local configuration only)
- Cursor - File-based detection via `.cursor` directory
  - SDK/Client: Direct filesystem access
  - Auth: None (local configuration only)
- Codex CLI - File-based detection via `.codex` directory
  - SDK/Client: Direct filesystem access
  - Auth: None (local configuration only)

## Data Storage

**Databases:**

- None - OAT uses no database systems
- All data is persisted in local JSON files

**File Storage:**

- Local filesystem only
- No cloud storage integration
- Manifest files: JSON format stored alongside skills/agents
- Configuration: JSON files in `.oat/` and provider directories
- Data locations:
  - Canonical assets: `.agents/skills/` and `.agents/agents/`
  - Sync manifests: `.oat/.sync.json` and provider-specific manifests
  - Project artifacts: `.oat/projects/<scope>/<project>/`

**Caching:**

- pnpm store (`.pnpm-store/`) for dependency caching during development
- Turbo cache (`.turbo/`) for build task caching
- No application-level caching service; all caching is local

## Authentication & Identity

**Auth Provider:**

- None - OAT does not require external authentication
- Local user detection based on machine configuration
- Provider-specific auth is managed by each AI tool (Claude Code, Cursor, Codex)
- Implementation approach: File-based detection of provider directories; no token or credential management

## Monitoring & Observability

**Error Tracking:**

- None - No external error tracking or monitoring services
- Local error handling via `CliError` class
- Errors reported to stderr/stdout and exit codes

**Logs:**

- Approach: Console-based logging with optional JSON output
- Logger implementation: `ui/logger.ts` with chalk-based colored output
- Verbose mode available via `--verbose` flag
- Optional JSON structured logging via `--json` flag
- No persistent logging; output is ephemeral to current shell session

## CI/CD & Deployment

**Hosting:**

- Deployed as local CLI tool via npm/pnpm
- Execution: Direct Node.js invocation or via npm scripts
- Package: `@oat/cli` (currently private, not on npm registry)
- No cloud deployment or hosting required

**CI Pipeline:**

- Platform: GitHub Actions
- Workflow file: `.github/workflows/ci.yml`
- Triggers: Push to main, pull requests to main
- Environment: Ubuntu latest
- Steps:
  1. Checkout code
  2. Setup pnpm with cache
  3. Setup Node.js from `.nvmrc`
  4. Install frozen dependencies (`pnpm install --frozen-lockfile`)
  5. Run checks (`pnpm check` - oxlint + oxfmt)
  6. Type checking (`pnpm type-check`)
  7. Run tests (`pnpm test` - Vitest)
  8. Build (`pnpm build` - TypeScript compilation via Turbo)

**Deployment Model:**

- No automated deployment pipeline
- Manual: Users install from source or npm (when public)
- CLI used locally within projects or via global npm link
- Git commit hooks handled via `tools/git-hooks/manage-hooks.js`

## Environment Configuration

**Required env vars:**

- None - No environment variables required for operation
- Optional: `GIT_HOOKS` environment variable (controls git hook setup in `prepare` script)
- CLI overrides: `--cwd <path>` for working directory, `--scope <scope>` for limiting operations

**Secrets location:**

- No secrets management required
- No API keys, tokens, or credentials needed
- Provider-specific secrets (if any) are managed by each AI tool independently

## Webhooks & Callbacks

**Incoming:**

- None - OAT does not expose HTTP endpoints or receive webhooks

**Outgoing:**

- None - OAT does not send webhooks or outbound HTTP requests

## Data Flow & Interactions

**Provider Sync Flow:**

1. User runs `oat sync --scope <scope>`
2. CLI scans `.agents/` for canonical assets
3. Detects installed providers (Claude, Cursor, Codex) via directory presence
4. Computes diff between canonical and provider views
5. Outputs dry-run plan to console
6. Updates provider directories using copy/symlink strategies (use `--dry-run` to preview)
7. Generates/updates `.sync.json` manifest with content hashes and timestamps

**Manifest Management:**

- Zod-validated JSON schemas for all file structures
- Content hashing (SHA for copy strategy validation)
- Datetime tracking for sync operations
- No external validation or verification services

**Build Dependency Graph:**

- Turbo orchestrates task execution across workspace packages
- All packages use `workspace:*` for internal dependencies
- No external package registry calls during CI (frozen lockfile)

---

_Integration audit: 2026-02-16_
