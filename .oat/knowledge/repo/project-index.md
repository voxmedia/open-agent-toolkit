---
oat_generated: true
oat_generated_at: 2026-02-02
oat_source_head_sha: d25643fb7a57fd977d1a9590690d26986d2d0ce8
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_index_type: full
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# open-agent-toolkit

## Overview

The Open Agent Toolkit (OAT) is a modular monorepo providing structured agent workflow systems for AI-assisted software development. It implements a knowledge-first development approach with multi-phase workflows (discovery, specification, design, planning, implementation) and human-in-the-loop gates for quality control.

## Purpose

Facilitates AI-assisted software engineering through:
- Structured workflow phases with clear boundaries and artifacts
- Knowledge base generation for accurate codebase context
- Agent-agnostic skill system supporting Claude Code, Cursor, and CLI
- Human-in-the-loop quality gates between phases
- Reusable patterns and templates for consistent development practices

## Technology Stack

**Runtime:** Node.js 22.17.0
**Language:** TypeScript 5.8.3 (ESM modules throughout)
**Package Manager:** pnpm 10.13.1 with workspaces
**Build System:** Turborepo 2.7.6 for monorepo orchestration
**Code Quality:** Biome 2.3.11 for linting and formatting
**Commit Standards:** Conventional Commits enforced via commitlint

## Architecture

**Pattern:** Modular monorepo with layered architecture separating concerns:
- **Agent Skills Layer** - Reusable workflow skills for development phases
- **Knowledge Generation Layer** - Comprehensive codebase analysis system
- **Project Workflow Layer** - State tracking and artifacts across phases
- **CLI Layer** - Command-line interface for operations

**Key Abstractions:**
- Skills system following Agent Skills Open Standard
- Knowledge base with auto-generated codebase analysis
- Project state management with frontmatter-driven workflows
- Template-based artifact generation

## Key Features

1. **Multi-Phase Workflow System** - Discovery → Spec → Design → Plan → Implement phases with HiL gates
2. **Knowledge Base Generation** - Parallel mapper agents analyze tech stack, architecture, conventions, and concerns
3. **Agent Skills** - 40+ specialized skills for documentation, project management, and workflow orchestration
4. **CLI Tools** - `npx openskills` command-line interface for skill invocation
5. **Git Integration** - Pre-commit hooks, commit validation, and branch management

## Project Structure

```
.agent/              Agent-related files and projects
  skills/            OAT workflow skills
  projects/          Multi-session development projects
.oat/                OAT-specific tooling and state
  knowledge/repo/    Generated codebase analysis
  projects/          Active OAT workflow projects
  scripts/           Automation scripts
  templates/         Artifact templates
packages/            Monorepo packages
  cli/               CLI implementation
tools/               Development tooling
  git-hooks/         Pre-commit and validation hooks
```

## Getting Started

**Prerequisites:**
- Node.js >=22.17.0
- pnpm >=10.13.1

**Setup:**
```bash
nvm use                # Use Node.js 22.17.0
pnpm install          # Install dependencies
pnpm build            # Build all packages
```

**Common Commands:**
```bash
pnpm dev              # Watch mode for all packages
pnpm lint             # Lint code with Biome
pnpm format           # Format code with Biome
pnpm type-check       # TypeScript type checking
pnpm test             # Run tests
```

## Development Workflow

1. **Start Project** - Use `/oat:new-project` to create structured project directory
2. **Generate Knowledge** - Run `/oat:index` to analyze codebase
3. **Discovery Phase** - Run `/oat:discovery` to gather requirements
4. **Specification** - Run `/oat:spec` to create formal specification
5. **Design** - Run `/oat:design` for technical design
6. **Planning** - Run `/oat:plan` to create implementation plan
7. **Implementation** - Run `/oat:implement` to execute plan with TDD

**Skills Invocation:**
```bash
npx openskills read <skill-name>        # Single skill
npx openskills read skill-one,skill-two # Multiple skills
```

## Testing

**Framework:** Test framework to be implemented
**Test Command:** `turbo run test`
**Structure:** Tests will be colocated with source files

## Known Issues

See [concerns.md](concerns.md) for technical debt, fragile areas, and known limitations. Key concerns include:
- OAT CLI not yet packaged/published
- Test framework not yet implemented
- Some skills require validation and dogfooding

---

**Generated Knowledge Base Files:**
- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
