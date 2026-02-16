---
oat_generated: true
oat_generated_at: 2026-02-02
oat_source_head_sha: d25643fb7a57fd977d1a9590690d26986d2d0ce8
oat_source_main_merge_base_sha: 6c147615ba8cf567d29814f1fe1d5667fc6e6fdf
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**Atlassian Services:**
- Jira (DWP project) - Ticket creation
  - SDK/Client: Atlassian MCP (Model Context Protocol)
  - Purpose: Create tickets via create-ticket skill
  - Auth: Configured via MCP integration (credentials managed separately)

**Model Context Protocol (MCP):**
- Atlassian MCP integration for Jira access
- Used by Claude Code and Cursor for ticket creation
- Enables programmatic interaction with Jira DWP project

**Code Editor Providers:**
- Claude Code (Anthropic) - Primary IDE with skill system
- Cursor - Supported IDE with skill system
- Codex CLI - Command-line interface support planned

## Data Storage

**Databases:**
- None - This is a lightweight toolkit without persistent data storage

**File Storage:**
- Local filesystem only - Project files, skills, documentation, and knowledge base
- Git repository for version control and history

**Caching:**
- Turbo cache - Build artifact caching in `.turbo/cache/`
- No external caching services

## Authentication & Identity

**Auth Provider:**
- Custom integrations per IDE
  - Claude Code: Native authentication via Anthropic
  - Cursor: Built-in authentication
  - Atlassian MCP: Configured separately for Jira access

**Implementation:**
- Environment-based secrets for local development
- `.env.local` files in app directories (gitignored)
- Secure credential handling for sensitive values

## Monitoring & Observability

**Error Tracking:**
- None configured - Development-focused project

**Logs:**
- Console output from CLI and scripts
- Git commit history for audit trail
- OAT project state tracking in `.oat/projects/` and `.oat/projects/shared/`

## CI/CD & Deployment

**Hosting:**
- GitHub - Source code repository
- GitHub Actions - CI/CD pipeline

**CI Pipeline:**
- GitHub Actions workflow (ci.yml)
- Triggers: push to main, pull requests to main
- Steps:
  1. Checkout code
  2. Setup pnpm and Node.js
  3. Install dependencies with frozen lockfile
  4. Lint code with Biome
  5. Type check with TypeScript
  6. Build with Turbo

**No Production Deployment:**
- Toolkit is distributed via npm as CLI tool
- Distributed as @oat/cli package
- Can be invoked via npx openskills

## Environment Configuration

**Required env vars:**
- GIT_HOOKS - Set to "0" to disable git hook setup (optional)
- NODE_ENV - Implicit (Node.js standard)
- CI - Set by GitHub Actions for conditional behavior

**Secrets location:**
- `.env.local` in individual app directories (gitignored)
- Sensitive values: API keys, credentials, tokens
- GitHub Secrets for CI/CD sensitive values

## Git Hooks

**Incoming (Local Git Hooks):**
- commit-msg - Validates commit message format
- pre-commit - Runs linting and formatting on staged files
- pre-push - Pre-push validation
- post-checkout - Refreshes metadata after checkout

**Outgoing (Git Interactions):**
- Commits to local and remote repositories
- Pull requests via GitHub (gh CLI)
- Branch operations

## Webhooks & Callbacks

**Incoming:**
- None - Toolkit is stateless and event-driven by user actions

**Outgoing:**
- None - No automatic webhooks or callbacks

## Development Integrations

**IDE Skills System:**
- Agent Skills Open Standard compliance
- Skills located in `.agents/skills/` directory
- Skills provide specialized capabilities for Claude Code and Cursor
- Available skills:
  - oat-* skills for workflow management (discovery, spec, design, plan, implement)
  - docs-* skills for documentation management
  - create-* skills for bootstrapping new projects/skills
  - Validated via npm script

**openskills CLI:**
- Tool to invoke skills from command line
- Usage: `npx openskills read <skill-name>`
- Supports multiple skills: `npx openskills read skill-one,skill-two`
- Returns skill content with base directory for resources

**Git Integration:**
- Pre-commit hooks via tools/git-hooks/
- Commit message validation via commitlint
- Conventional Commits format enforcement

---

*Integration audit: 2026-02-02*