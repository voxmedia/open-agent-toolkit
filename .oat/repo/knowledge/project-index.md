---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: a80661894616fc9323542a4bcbcc22c08917e440
oat_index_type: full
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

# open-agent-toolkit

## Overview

Open Agent Toolkit (OAT) is an open-source toolkit for defining and managing agent skills, subagents, and hooks across multiple AI coding providers (Claude Code, Cursor, Codex CLI). It provides a provider-agnostic interoperability layer with optional workflow scaffolding for structured project execution.

## Purpose

OAT solves the fragmentation problem of managing AI coding assistant configurations across different providers. It provides a canonical source of truth for skills and agents, with automated sync to each provider's expected directory structure. Optionally, it layers a structured discovery-to-implementation workflow on top.

## Technology Stack

- **Language:** TypeScript 5.8.3 (ESM modules)
- **Runtime:** Node.js 22.17.0
- **Package Manager:** pnpm with workspaces
- **Build System:** Turborepo 2.7.6 with TypeScript compilation
- **Linting/Formatting:** Biome 2.3.11
- **Testing:** Vitest 4.0.18
- **CLI Framework:** Commander.js 12.x
- **Validation:** Zod 3.x

## Architecture

Modular TypeScript CLI with layered architecture and adapter pattern for provider support. Key layers: Application (bootstrap), Commands (CLI handlers), Engine (sync computation/execution), Providers (Claude/Cursor/Codex adapters), Manifest (state persistence), Drift (divergence detection), and UI (output/logging).

## Key Features

- **Provider Sync:** Symlink or copy canonical skills/agents to provider-specific locations
- **Drift Detection:** Identify divergence between canonical and provider copies
- **Multi-Provider Support:** Claude Code, Cursor, and Codex adapters
- **Manifest-Based State:** JSON manifest tracks sync state with content hashes
- **Workflow Skills:** Optional structured discovery/spec/design/plan/implement lifecycle

## Project Structure

```
open-agent-toolkit/
├── packages/cli/         # @oat/cli - Main CLI application
│   └── src/
│       ├── app/          # Bootstrap and program factory
│       ├── commands/     # CLI commands (init, sync, status, providers, doctor)
│       ├── engine/       # Sync plan computation and execution
│       ├── providers/    # Provider adapters (claude, cursor, codex)
│       ├── manifest/     # State persistence and hashing
│       ├── drift/        # Drift detection
│       ├── config/       # Configuration loading
│       ├── fs/           # Filesystem abstractions
│       ├── ui/           # Logger, spinner, output formatting
│       └── shared/       # Common types
├── .agents/              # Canonical skills and agents (source of truth)
├── .oat/                 # Runtime state, projects, knowledge
├── docs/                 # Documentation
└── tools/                # Git hooks and utilities
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run CLI
pnpm run cli -- --help
pnpm run cli -- status --scope all
pnpm run cli -- sync --scope all --apply
```

## Development Workflow

```bash
pnpm build          # Build all packages
pnpm lint           # Lint with Biome
pnpm format         # Format with Biome
pnpm type-check     # TypeScript type checking
pnpm test           # Run Vitest tests
pnpm dev            # Watch mode development
```

## Testing

Vitest 4.0.18 with co-located test files (`*.test.ts`). Tests use vi.mock/vi.spyOn for mocking, temp directories for filesystem tests, and factory functions for test data. Run with `pnpm test`.

## Known Issues

See [concerns.md](concerns.md) for full details. Key areas: early-stage project (v0.0.1), single-package monorepo structure, in-progress implementation work tracked in `.oat/projects/`.

---

**Generated Knowledge Base Files:**
- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
