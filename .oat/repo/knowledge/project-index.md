---
oat_generated: true
oat_generated_at: 2026-04-02
oat_source_head_sha: c9524eaf5e1fd1b527a821766d72f0df6ef70beb
oat_source_main_merge_base_sha: 60b392c290313ca29404822d9952bbffdb3cb2ac
oat_index_type: full
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# open-agent-toolkit

## Overview

Open Agent Toolkit is a pnpm/Turborepo monorepo for portable, provider-agnostic agent tooling. It combines a filesystem-oriented CLI, reusable workflow assets, a docs toolkit, and a first-party docs application in one repository.

The repo is organized around four public-facing surfaces:

- the OAT CLI in `packages/cli`
- reusable docs libraries in `packages/docs-*`
- a reference Fumadocs site in `apps/oat-docs`
- canonical skills, templates, and workflow artifacts under `.agents/` and `.oat/`

## Purpose

The project exists to let teams define canonical agent assets once, sync them across AI tooling providers, and optionally run structured project workflows with durable markdown artifacts. The docs packages extend that surface by making OAT's documentation patterns reusable outside this repo.

## Technology Stack

- TypeScript monorepo on Node.js 22 with pnpm and Turborepo
- CLI stack: Commander, Chalk, Ora, Zod, YAML, TOML
- Docs stack: Next.js 16, React 19, Fumadocs, Unified/remark, Mermaid
- Quality tools: Vitest, oxlint, oxfmt, TypeScript strict mode

## Architecture

The architecture is split into a large CLI package, three focused docs libraries, and one docs app. The CLI owns command routing, sync logic, provider adapters, workflow/project automation, and asset bundling. The docs packages keep config, transforms, and theme components separate so they can be consumed independently by the docs app and generated docs scaffolds.

## Key Features

- Provider-oriented CLI for syncing canonical skills/agents/rules across AI tooling environments
- OAT workflow/project lifecycle with markdown artifacts under `.oat/projects/`
- Tool-pack installation/update flows backed by bundled skills, templates, docs, and scripts
- Reusable docs libraries for Fumadocs-based consumer documentation sites
- Reference docs site deployed from `apps/oat-docs`

## Project Structure

- `.agents/` contains canonical skills, agents, and supporting docs
- `.oat/` contains workflow templates, generated knowledge, repo tracking, and project artifacts
- `packages/cli/` contains the CLI runtime, tests, and bundled assets
- `packages/docs-config/`, `packages/docs-theme/`, and `packages/docs-transforms/` contain reusable docs libraries
- `apps/oat-docs/` contains the first-party docs app and markdown content

## Getting Started

```bash
pnpm install
pnpm run cli -- help
pnpm build
pnpm build:docs
```

Useful root scripts:

- `pnpm build`
- `pnpm build:docs`
- `pnpm test`
- `pnpm type-check`
- `pnpm lint`
- `pnpm run cli -- <command>`

## Development Workflow

- Root scripts orchestrate package builds and checks through Turbo.
- `packages/cli` bundles assets before compilation.
- `apps/oat-docs` regenerates its docs index during `predev` and `prebuild`.
- OAT workflow progress is tracked in `.oat/projects/**` and summarized in `.oat/state.md`.

## Testing

- Vitest is the test runner across the code packages.
- Most tests are co-located in `src/` with `.test.ts` suffix.
- The CLI package has the broadest coverage, including integration-style command and filesystem tests.

## Known Issues

- Repo knowledge artifacts become invalid when copied across unrelated git histories and should be regenerated after a fork or migration.
- Public package metadata and GitHub release workflows now target
  `@open-agent-toolkit/*`, but the first publish still requires manual npm
  bootstrap before steady-state trusted publishing is fully validated.

## Generated Knowledge Base Files

- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and package layering
- [structure.md](structure.md) - Directory layout and file placement guidance
- [integrations.md](integrations.md) - External services, deployment, and environment hooks
- [testing.md](testing.md) - Test framework and patterns
- [conventions.md](conventions.md) - Code style and repo conventions
- [concerns.md](concerns.md) - Technical debt, fragility, and release gaps
