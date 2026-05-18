---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_index_type: full
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# open-agent-toolkit

## Overview

The Open Agent Toolkit (OAT) is a TypeScript ESM monorepo that provides a
provider-agnostic CLI for managing AI coding-agent skills, agents, and
structured project workflows across multiple providers (Claude Code, Codex,
Copilot, Cursor, Gemini). Its core capability is a sync engine that distributes
canonical skill/agent definitions to provider-specific locations, detects drift,
and tracks multi-session "OAT projects" through a discovery → design → plan →
implement lifecycle.

## Purpose

OAT exists to keep AI agent capabilities consistent across the many CLI tools
and IDEs a team might use. Rather than maintaining separate skill copies per
provider, teams author skills once in `.agents/skills/` and let OAT sync them
out, applying provider-specific path and rule transformations. It also brings
spec-driven discipline to agent-assisted development through versioned project
artifacts (`state.md`, `spec.md`, `design.md`, `plan.md`, `implementation.md`).

## Technology Stack

- **Language:** TypeScript 5.8.3 (ESM, all packages `"type": "module"`)
- **Runtime:** Node.js 22.17.0
- **Package Manager:** pnpm 10.13.1 (workspaces)
- **Build:** Turborepo 2.7.6 → `dist/` via `tsc` + tsc-alias
- **CLI:** Commander.js 12.1.0, `@inquirer/prompts`, chalk, ora
- **Validation:** zod 3.25.76; YAML/TOML parsing via `yaml` and `@iarna/toml`
- **Docs site:** Next.js 16, React 19, Fumadocs 16, Tailwind CSS 4
- **Testing:** Vitest 4 (unit/integration), Playwright 1.59 (E2E smoke)
- **Quality:** oxlint 1.52, oxfmt 0.36, commitlint, lint-staged

See [stack.md](stack.md) for full dependency detail.

## Architecture

Layered CLI application built around a command registry and a provider-adapter
plugin pattern. The entry point (`packages/cli/src/index.ts`) routes through an
application layer into domain commands, which drive a sync **engine** that
computes and executes `SyncPlan`s against a tracked `Manifest`. A separate
read-only **control-plane** library parses OAT project state from artifact YAML
frontmatter. Provider adapters decouple provider-specific file locations and
rule syntax from the core engine.

See [architecture.md](architecture.md) for layers, data flow, and abstractions.

## Key Features

- **Multi-provider sync** — distribute canonical skills/agents to Claude, Codex,
  Copilot, Cursor, and Gemini with per-provider path/rule transforms
- **Drift & stray detection** — compare the manifest against the filesystem to
  surface divergence and untracked files
- **OAT project lifecycle** — spec-driven and quick workflows tracked through
  versioned markdown artifacts
- **Knowledge & reference generation** — codebase knowledge index, repo
  reference docs, and analysis artifacts
- **Docs pack** — scaffold and maintain a Fumadocs/Next.js documentation site
- **Git hook integration** — pre-commit lint/format/type-check, commit-msg
  validation, pre-push release checks

## Project Structure

```
packages/
  cli/             # Main OAT CLI (commands, engine, providers, manifest, drift)
  control-plane/   # Read-only project-state parsing library
  docs-config/     # Docs site configuration
  docs-theme/      # Docs site theme/components
  docs-transforms/ # Markdown/MDX AST transforms
apps/
  oat-docs/        # Documentation site (Next.js + Fumadocs)
.agents/skills/    # Canonical skill definitions (synced to providers)
.agents/agents/    # Canonical agent definitions
.oat/              # Templates, scripts, projects, repo knowledge/reference
tools/git-hooks/   # Git hook scripts and manager
```

See [structure.md](structure.md) for the full directory map and "where to add
new code" guidance.

## Getting Started

```bash
# Prerequisites: Node.js 22.17.0+, pnpm 10.13.1+
pnpm install
pnpm build              # Build all packages/apps (docs excluded for speed)
pnpm run cli -- help    # Run the OAT CLI from repo root
```

After creating or switching to a worktree, run `pnpm run worktree:init` before
using the CLI workflow.

## Development Workflow

- `pnpm build` — build all packages and applications
- `pnpm lint` / `pnpm format` — oxlint and oxfmt checks (`:fix` variants
  auto-fix)
- `pnpm type-check` — TypeScript checking across packages
- `pnpm test` — run the workspace test suite
- `pnpm release:validate` — required before finishing publishable-package work
- Conventional commits enforced via commitlint; pre-commit hooks run
  lint/format/type-check on staged files

Code style: 80-char width, 2-space indent, single quotes, trailing commas.
Imports use `./` for same-directory modules and TypeScript path aliases
(`@engine/*`, `@ui/*`, etc.) for everything else — never `../` or `src/`.
See [conventions.md](conventions.md).

## Testing

Vitest is the test runner, with test files colocated as `<module>.test.ts`
alongside source. Unit tests mock external modules via `vi.mock`/`vi.spyOn`;
integration tests use real temp directories. Playwright covers E2E smoke tests.
No coverage threshold is enforced (`passWithNoTests: true`). The CLI package
alone has 550+ tests.

```bash
pnpm test                                    # all workspace tests
pnpm --filter @open-agent-toolkit/cli test   # CLI package tests
```

See [testing.md](testing.md) for patterns and fixtures.

## Known Issues

Notable concerns include type-safety casts in the `ora` and remark-tabs
integrations, several oversized command modules (`config`, `init tools`,
`archive-utils`) that warrant decomposition, fragile config-resolution and
state-parsing logic, and test-coverage gaps for Windows paths, non-TTY prompts,
and malformed frontmatter. See [concerns.md](concerns.md) for the full audit.

---

**Generated Knowledge Base Files:**

- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
