---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_index_type: full
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# open-agent-toolkit

## Overview

Open Agent Toolkit (OAT) provides open standards and open source tooling for interoperable agent development across AI providers. It implements a structured workflow methodology (Discovery → Spec → Design → Plan → Implement) with agent-agnostic skill definitions compatible with Claude Code, Cursor, and other AI assistants.

## Purpose

- Define reusable agent skills following the Agent Skills Open Standard
- Provide structured development workflows with human-in-the-loop checkpoints
- Generate and maintain codebase knowledge bases for AI-assisted development
- Enable consistent project management across AI coding assistants

## Technology Stack

- **Runtime:** Node.js 22.17.0+ with TypeScript 5.8.3
- **Build:** Turborepo 2.7.6 monorepo with pnpm 10.13.1
- **Linting:** Biome 2.3.11 for unified linting and formatting
- **Module:** ES2022 target with ESM modules

## Architecture

- **Pattern:** Agent Skill Framework + Workflow Orchestration
- **Skill Layer:** `.agent/skills/` - SKILL.md definitions
- **Project Layer:** `.agent/projects/` - Workflow artifacts
- **Knowledge Layer:** `.oat/knowledge/repo/` - Codebase analysis
- **CLI Layer:** `packages/cli/` - Programmatic access (placeholder)

## Key Features

- OAT workflow phases: Discovery, Spec, Design, Plan, Implement
- Parallel knowledge base generation with mapper agents
- Human-in-the-loop review gates
- Traceability with stable task IDs (p01-t01, etc.)
- Git-aware staleness detection for knowledge base

## Project Structure

```
open-agent-toolkit/
├── .agent/skills/       # Skill definitions (oat-*, create-*, etc.)
├── .agent/projects/     # Project artifacts (gitignored)
├── .oat/knowledge/repo/ # Generated knowledge base
├── .oat/templates/      # Document templates
├── packages/cli/        # CLI package (@oat/cli)
└── tools/git-hooks/     # Git hook management
```

## Getting Started

**Requirements:**
- Node.js 22.17.0+ (use `nvm use`)
- pnpm 10.13.1+

**Setup:**
```bash
pnpm install
pnpm build
```

## Development Workflow

**Common Commands:**
- `pnpm build` - Build all packages
- `pnpm dev` - Watch mode development
- `pnpm lint` / `pnpm lint:fix` - Code linting
- `pnpm type-check` - TypeScript validation
- `pnpm test` - Run tests (when implemented)

**OAT Skills:**
- `/oat:progress` - Check project status
- `/oat:index` - Generate knowledge base
- `/oat:discovery` - Start discovery phase
- `/oat:spec`, `/oat:design`, `/oat:plan`, `/oat:implement`

## Testing

**Status:** Infrastructure ready, no tests implemented
**Command:** `pnpm test`
**Framework:** Not yet configured

## Known Issues

- CLI is placeholder only (planned for future phases)
- No test framework configured yet
- Project artifacts are local-only (gitignored)

See [concerns.md](concerns.md) for full details.

---

**Generated Knowledge Base Files:**
- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
