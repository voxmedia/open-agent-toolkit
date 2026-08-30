---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_index_type: full
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# open-agent-toolkit

## Overview

Open Agent Toolkit is a TypeScript ESM monorepo for installing, synchronizing,
and operating reusable agent workflows across coding-agent providers. Its
published CLI manages canonical agent assets, OAT project lifecycle state, and
provider-specific materialization; companion packages support a Fumadocs site
and Markdown transforms.

## Purpose

The repository provides a common operational layer for structured
agent-assisted engineering. It keeps OAT's canonical skills, agents, and rules
under `.agents/`, adapts them to provider-native views, and supplies a
spec-driven project workflow with file-backed state and review artifacts.

## Technology Stack

- TypeScript ESM and JavaScript tooling on Node.js 22.17+ with pnpm 10
- Turborepo orchestration, TypeScript compilation, oxlint, and oxfmt
- Commander CLI with Zod and YAML/TOML/JSONC parsing
- Vitest plus Node test-runner smoke/release/skill suites
- Next.js, React, and Fumadocs for the documentation site

See [stack.md](stack.md) for versions, dependencies, and platform needs.

## Architecture

The core shape is a command-oriented CLI over a canonical asset and
synchronization engine. It scans `.agents/`, computes safe provider-specific
plans, records manifests and drift, and exposes project status through a
read-only control-plane package. The docs application is separately built and
deployed, using shared documentation packages.

See [architecture.md](architecture.md) for layers, data flow, state handling,
entry points, and cross-cutting concerns.

## Key Features

- Canonical asset synchronization to Claude, Cursor, and Codex provider views
- File-backed OAT project lifecycle, backlog, review, and worktree workflows
- Provider-aware materialization, drift detection, and diagnostics
- Documentation generation, transforms, static search, and GitHub Pages deploy
- Optional GitHub, npm, AWS/S3, and coding-agent runtime integrations

## Project Structure

```text
.agents/                 Canonical skills, agents, rules, and workflow guidance
.oat/                    OAT configuration, templates, project artifacts, and tracking
packages/cli/            Published oat CLI and synchronization engine
packages/control-plane/  Read-only project-state parsing and recommendations
packages/docs-*/         Shared documentation configuration, theme, and transforms
apps/oat-docs/           Next.js/Fumadocs documentation application
tools/                   Release, smoke, validation, and managed Git-hook tooling
.github/workflows/       CI, release, and docs deployment workflows
```

See [structure.md](structure.md) for directory ownership and code-placement
conventions.

## Getting Started

Use Node.js 22.17+ and pnpm 10.13.1, then install dependencies with
`pnpm install`. Common local checks are `pnpm check`,
`pnpm type-check`, `pnpm test`, and `pnpm build`.

## Development Workflow

The CLI runs from the workspace with `pnpm run cli -- <command>`. OAT
content is canonical under `.agents/`; refresh provider projections with
`oat sync --scope all`. Changes to canonical skills require a matching
frontmatter version bump and, when shipped, lockstep public package version
validation.

See [conventions.md](conventions.md) for formatting, imports, errors, and
module style.

## Testing

Vitest covers packages and command workflows, while Node's test runner drives
repository smoke, skill, and release suites. The CI gate runs check, type
check, test, build, release validation, and docs build; lint and format remain
important local checks for relevant source and skill changes.

See [testing.md](testing.md) for test organization and commands.

## Known Issues and Risks

The refreshed audit notes manual-only lint/format coverage in CI, repeated
public-package lists across release workflow loops, checkout-hook installation
cost, Node-version differences between CI and release jobs, and no
repository-wide coverage threshold. These are evidence-backed operational
concerns, not asserted defects in the plugin project.

See [concerns.md](concerns.md) for context and source references.

## Integrations

GitHub Actions and GraphQL, npm publishing/update checks, optional AWS S3
archive or static publication, and local Codex/Claude/Cursor runtime smoke
harnesses are the primary external boundaries. Credentials are delegated to
the relevant local CLI, environment, or CI identity rather than stored in the
repository.

See [integrations.md](integrations.md) for authentication and deployment
details.

## Generated Knowledge Base Files

- [stack.md](stack.md) — technologies and dependencies
- [architecture.md](architecture.md) — system design and patterns
- [structure.md](structure.md) — directory layout
- [integrations.md](integrations.md) — external services
- [testing.md](testing.md) — test structure and practices
- [conventions.md](conventions.md) — code style and patterns
- [concerns.md](concerns.md) — technical debt and operational risks
