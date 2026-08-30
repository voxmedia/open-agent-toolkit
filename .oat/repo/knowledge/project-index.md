---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_index_type: full
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# open-agent-toolkit

## Overview

Open Agent Toolkit (OAT) is a TypeScript monorepo for managing portable agent
assets and file-backed engineering workflows across multiple AI coding
providers. It ships a command-line interface, a read-only project-state control
plane, reusable documentation packages, and a statically exported documentation
site.

## Purpose

OAT keeps provider-neutral skills, agents, and rules canonical under `.agents/`,
then safely materializes provider-specific views for Codex, Claude Code, Cursor,
GitHub Copilot, and Gemini. It also structures project discovery, planning,
implementation, review, archival, and repository knowledge as inspectable
Markdown artifacts under `.oat/`.

## Technology Stack

- **Language and runtime:** TypeScript ESM on Node.js 22.17.0.
- **Workspace:** pnpm 10.13.1 with Turborepo task orchestration.
- **CLI:** Commander, Zod, YAML, TOML, and JSONC support.
- **Documentation:** Next.js, React, Fumadocs, Tailwind CSS, and reusable docs
  configuration, theme, and transform packages.
- **Quality:** Vitest, Node's built-in test runner, oxlint, tsgolint, and oxfmt.

See [stack.md](stack.md) for versions, dependencies, configuration, and platform
requirements.

## Architecture

The repository is organized as a command-oriented CLI plus focused domain
layers. CLI commands resolve configuration and context, provider adapters map
canonical assets to provider-specific targets, and the synchronization engine
uses a scan-plan-validate-execute flow with a persisted manifest. The
`@open-agent-toolkit/control-plane` package separately parses project Markdown
into typed state and recommends the next workflow operation without mutating
project records. The documentation app composes three reusable packages for
configuration, rendering, and Markdown transforms.

See [architecture.md](architecture.md) for layers, data flows, entry points, and
key abstractions.

## Key Features

- Synchronizes canonical skills, agents, and rules to five provider surfaces
  using provider adapters and configurable copy or symlink strategies.
- Runs file-backed project workflows with discovery, design, planning,
  implementation, review, progress, reconciliation, and archive commands.
- Exposes a read-only control plane for project state, summaries, and workflow
  recommendations.
- Builds and publishes reusable documentation packages and a static Fumadocs
  site.
- Integrates with local provider CLIs, GitHub CLI, npm, and optional AWS S3
  archival while leaving authentication to those native tools.

## Project Structure

- `packages/cli/` — the `oat` executable, command groups, sync engine,
  providers, validation, and project workflows.
- `packages/control-plane/` — read-only project-state parsing and recommendation
  policy.
- `packages/docs-config/`, `packages/docs-theme/`, and
  `packages/docs-transforms/` — reusable documentation packages.
- `apps/oat-docs/` — Next.js/Fumadocs documentation application and authored
  Markdown.
- `.agents/` — canonical skills, agent roles, rules, and agent documentation.
- `.oat/` — repository knowledge, project records, templates, scripts,
  configuration, and sync metadata.
- `tools/` and `scripts/` — repository verification, release, smoke, Git-hook,
  documentation, and worktree automation.

See [structure.md](structure.md) for detailed directory ownership and where to
add new code.

## Getting Started

Prerequisites are Node.js 22.17.0 and pnpm 10.13.1.

```bash
pnpm install --frozen-lockfile
pnpm run worktree:init
pnpm run cli -- help
```

Build the publishable packages and applications with `pnpm build`; build the
documentation site and its dependencies with `pnpm build:docs`.

## Development Workflow

Common commands from the repository root:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm run cli -- <command> [options]
pnpm dev
```

`pnpm check` covers package checks, documentation markdownlint, and canonical
skill validation. Changes under `tools/smoke` or `.agents/skills` also require
the separately scoped `pnpm lint` and `pnpm format` checks described in
`AGENTS.md`.

## Testing

Vitest provides the primary colocated TypeScript unit and integration suites.
Node's built-in test runner covers smoke, skill, and release checks. Tests
prefer isolated temporary directories and real filesystem behavior, with narrow
mocking at failure seams. No repository-wide coverage threshold is configured.

See [testing.md](testing.md) for suite layout, fixtures, mocking patterns, and
targeted commands.

## Known Issues

The current concerns audit highlights maintainability pressure in several large
CLI command modules, a theoretical archive-path collision, dependency advisory
exposure, and untested error and size boundaries around client-side Mermaid
rendering. These findings mix verified gaps with explicitly labeled risks; read
[concerns.md](concerns.md) before acting on them.

## Generated Knowledge Base Files

- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
