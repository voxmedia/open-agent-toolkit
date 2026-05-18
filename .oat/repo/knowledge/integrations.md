---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# External Integrations

**Analysis Date:** 2026-05-17

## APIs & External Services

**Version Control & Repository Management:**

- GitHub GraphQL API - Used for collecting PR review comments and repository metadata
  - Client: `gh` CLI via `execFile` (Node.js child process)
  - Auth: GitHub CLI authentication (configured in user's `.config/gh/` or similar; uses `gh api graphql`)
  - Usage location: `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`
  - Implementation: Uses `gh api graphql` command to query merged PRs and review comments, with support for pagination via GraphQL cursors

**Agent/Provider Integrations:**

- Claude Code
  - Configuration: `.claude/` directory marker for detection
  - File mappings: `packages/cli/src/providers/claude/paths.ts`
  - Implementation: Provider adapter at `packages/cli/src/providers/claude/adapter.ts`

- GitHub Copilot
  - Configuration: `.copilot/`, `.github/copilot-instructions.md`, `.github/agents`, `.github/skills`, `.github/instructions` directory markers
  - File mappings: `packages/cli/src/providers/copilot/paths.ts`
  - Implementation: Provider adapter at `packages/cli/src/providers/copilot/adapter.ts`
  - Rule format: Custom rule format in `.github/` that is normalized to canonical format via `packages/cli/src/providers/copilot/rule-transform.ts`

- Gemini CLI
  - Configuration: `.gemini` directory marker for detection
  - File mappings: `packages/cli/src/providers/gemini/paths.ts`
  - Implementation: Provider adapter at `packages/cli/src/providers/gemini/adapter.ts`

- Cursor IDE
  - Configuration: `.cursor` directory marker for detection
  - File mappings: `packages/cli/src/providers/cursor/paths.ts`
  - Implementation: Provider adapter at `packages/cli/src/providers/cursor/adapter.ts`

- Codex CLI
  - Configuration: `.codex` directory marker for detection
  - File mappings: `packages/cli/src/providers/codex/paths.ts`
  - Implementation: Provider adapter at `packages/cli/src/providers/codex/adapter.ts`

**Linear (Planned Integration):**

- Linear MCP Server
  - Endpoint: `https://mcp.linear.app/mcp` (official MCP server)
  - Auth: Linear API key or OAuth token configured in agent MCP settings
  - Status: Design phase; handover document at `.oat/projects/shared/remote-project-management/linear-integration-discovery-handover.md`
  - Use case: Bidirectional sync of backlog items ↔ Linear issues, status tracking via GitHub integration

## Data Storage

**Databases:**

- Not detected - OAT is a CLI-based toolkit without persistent data storage; state is stored in markdown files within project directories

**File Storage:**

- Local filesystem only - All projects, state files, skills, and agents are stored in local `.oat/` and `.agents/` directories and version-controlled via git

**Caching:**

- Not detected

## Authentication & Identity

**Auth Provider:**

- Provider-based authentication
  - Implementation: Per-provider configuration (e.g., `.claude/`, `.copilot/` directories managed by respective tools)
  - GitHub: Uses user's configured `gh` CLI authentication for GraphQL queries
  - Credentials: Managed by provider tools, not by OAT
  - No centralized auth system; each provider handles its own credentials

## Monitoring & Observability

**Error Tracking:**

- Not detected - No external error tracking service integration

**Logs:**

- CLI logger via `context.logger` in `packages/cli/src/app/command-context.ts`
- All CLI output routed through logger utilities, no external logging service

## CI/CD & Deployment

**Hosting:**

- GitHub Pages - OAT docs site deployed to GitHub Pages
  - Workflow: `.github/workflows/deploy-docs.yml`
  - Build artifact: `apps/oat-docs/out/` (static build output)
  - Trigger: Push to main on docs paths or manual workflow_dispatch

**CI Pipeline:**

- GitHub Actions
  - CI workflow: `.github/workflows/ci.yml` - Runs on push to main and all PRs
    - Steps: checkout, setup pnpm, install, check (lint/format), type-check, test, build, skill validation, release validation
  - Release workflow: `.github/workflows/release.yml` - Creates tags and publishes packages on push to main
    - Uses npm trusted publishing via GitHub OIDC
    - Supports manual reruns from existing release tags
  - Release dry-run: `.github/workflows/release-dry-run.yml` - Validates package changes on PRs
  - Docs deployment: `.github/workflows/deploy-docs.yml` - Builds and deploys docs to GitHub Pages

**Package Registry:**

- npm - Publishable packages under `packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`
  - Lockstep versioning: All five public packages must share version bumps for released content
  - Repository: GitHub (voxmedia/open-agent-toolkit)

## Environment Configuration

**Required env vars:**

- Not detected - No environment variables required for core functionality
- GitHub CLI (`gh`) uses standard authentication configured outside the toolkit

**Secrets location:**

- GitHub Actions secrets: Used in CI/CD workflows for npm publishing via OIDC
- No local secrets files required or supported; credentials managed by provider tools

## Webhooks & Callbacks

**Incoming:**

- Not detected

**Outgoing:**

- GitHub GraphQL queries only (read-only) for PR comment collection
- No webhook subscriptions or outgoing callbacks

---

_Integration audit: 2026-05-17_
