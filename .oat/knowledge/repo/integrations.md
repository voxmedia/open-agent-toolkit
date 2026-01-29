---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# External Integrations

**Analysis Date:** 2026-01-28

## AI Assistants

### Claude Code
- **Integration:** CLAUDE.md imports AGENTS.md for skill discovery
- **Configuration:** `.claude/settings.local.json`
- **Skills:** Available via `/skill-name` shortcuts

### Cursor
- **Integration:** `.cursor/rules` for AI rules
- **Configuration:** `.cursorignore`
- **Skills:** Available via `npx openskills read`

### openskills CLI
- **Integration:** Agent Skills Open Standard compatibility
- **Usage:** `npx openskills read <skill-name>`

## Version Control

### Git
- **Hooks:** Custom management via `tools/git-hooks/`
- **Pre-commit:** lint-staged for staged files
- **Commit linting:** commitlint with conventional commits

### GitHub
- **CI/CD:** `.github/workflows/ci.yml`
- **PR Template:** `.github/PULL_REQUEST_TEMPLATE.md`
- **Actions:** Build, lint, type-check on push/PR

## Development Tools

### VS Code
- **Settings:** `.vscode/settings.json`
- **Extensions:** `.vscode/extensions.json`

### MCP (Model Context Protocol)
- **Configuration:** `.mcp.json` (gitignored)
- **Purpose:** Model context configuration

## Package Ecosystem

### pnpm
- **Workspace:** `pnpm-workspace.yaml`
- **Registry:** npmjs.com (default)

### Turborepo
- **Remote caching:** Not configured (local only)

## External Services

### None Currently

The project does not currently integrate with:
- Databases
- Authentication providers
- External APIs
- Webhooks
- Cloud services

## Environment Configuration

**Local overrides:** Environment variables can be set in:
- `.env` (gitignored)
- `.env.local` (gitignored)

**Sensitive values:** No secrets management configured yet

---

*Integrations analysis: 2026-01-28*
