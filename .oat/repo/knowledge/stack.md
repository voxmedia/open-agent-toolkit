---
oat_generated: true
oat_generated_at: 2026-05-17
oat_source_head_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_source_main_merge_base_sha: f3ea8f007f545638a6b9ad86712cf94df98e9758
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Technology Stack

**Analysis Date:** 2026-05-17

## Languages

**Primary:**

- TypeScript 5.8.3 - Entire codebase (`packages/`, `apps/`, `tools/`)
- JavaScript - Build scripts and Node.js tooling

**Secondary:**

- Bash - Build and deployment scripts (e.g., `packages/cli/scripts/bundle-assets.sh`)
- YAML - Configuration and template files (`.oat/templates/`, `.agents/skills/`)

## Runtime

**Environment:**

- Node.js 22.17.0 (specified in `.nvmrc` and `package.json` engines)
- ESM (ES Modules) — all packages use `"type": "module"`

**Package Manager:**

- pnpm 10.13.1 (workspace monorepo manager)
- Lockfile: `pnpm-lock.yaml` (present, v9.0)

## Frameworks

**Core:**

- Next.js 16.1.6 - Documentation site (`apps/oat-docs/`) and Fumadocs integration
- React 19.2.4 - UI components for docs and theme
- Commander.js 12.1.0 - CLI argument parsing (`packages/cli/src/app/create-program.ts`)

**Testing:**

- Vitest 4.0.18 - Unit/integration tests (`packages/cli/`, `packages/control-plane/`, `packages/docs-config/`, `packages/docs-transforms/`)
- Playwright 1.59.1 - E2E testing and browser automation (link checking, visual smoke tests)

**Build/Dev:**

- Turborepo 2.7.6 - Monorepo task orchestration (`turbo.json` with cached builds)
- TypeScript 5.8.3 - Compilation to ES2022 target with strict type checking
- tsx 4.21.0 - Direct TypeScript execution for dev scripts and CLI
- tsc-alias 1.8.16 - Path alias resolution in compiled output

**Documentation:**

- Fumadocs 16.6.13 - Documentation framework (`fumadocs-core`, `fumadocs-mdx`, `fumadocs-ui`)
- Tailwind CSS 4.2.1 - Styling (`apps/oat-docs/`)
- MDX 3.1.1 - Markdown + JSX for docs
- Remark 11.0.5 - Markdown AST transforms (`packages/docs-transforms/`)

**Code Quality:**

- Oxlint 1.52.0 - Linting (configured in `.oxlintrc.json`)
- Oxfmt 0.36.0 - Code formatting (configured in `.oxfmtrc.jsonc`)
- Commitlint 19.8.1 - Commit message validation (conventional commits, config in `commitlint.config.js`)
- lint-staged 15.5.2 - Pre-commit hooks (`.lintstagedrc.mjs`)

## Key Dependencies

**Critical:**

- `@iarna/toml` 2.2.5 - TOML parsing for config files
- `yaml` 2.8.2 - YAML parsing (used across `@open-agent-toolkit/cli` and `@open-agent-toolkit/control-plane`)
- `zod` 3.25.76 - Schema validation and type inference (`packages/cli/src/config/sync-config.ts`)
- `@inquirer/prompts` 8.2.0 - Interactive CLI prompts

**CLI & Output:**

- `chalk` 5.6.2 - Terminal color output (`packages/cli/src/ui/`)
- `ora` 9.0.0 - Terminal spinners and loading indicators

**Documentation:**

- `flexsearch` 0.8.212 - Full-text search indexing
- `mermaid` 11.6.0 - Diagram rendering in docs
- `next-themes` 0.4.6 - Dark mode theme switching
- `remark-github-blockquote-alert` 2.0.1 - GitHub-style alerts in Markdown
- `remark-parse` 11.0.0 - Markdown parsing
- `unified` 11.0.5 - AST processing pipeline
- `unist-util-visit` 5.0.0 - AST tree traversal
- `prettier` 3.8.1 - Markdown formatting (dev dependency, `apps/oat-docs/`)
- `markdownlint-cli2` 0.13.0 - Markdown linting (dev dependency)

**Types:**

- `@types/node` 22.19.7 - Node.js type definitions
- `@types/react` 19.2.14 - React type definitions
- `@types/react-dom` 19.2.3 - React DOM type definitions
- `@types/mdast` 4.0.4 - Markdown AST types
- `@types/mdx` 2.0.13 - MDX type definitions

## Configuration

**TypeScript:**

- `tsconfig.json` (root) - Shared base configuration (ES2022 target, strict mode enabled)
- Individual `tsconfig.json` files in `packages/*/` for package-specific settings
- tsc-alias configured for path resolution: `resolveFullPaths: true`, `resolveFullExtension: ".js"`

**Build System:**

- `turbo.json` - Turborepo task definitions with caching strategy
  - `globalDependencies: [".agents/skills/**"]` - Skills bundled into CLI assets
  - Outputs: `dist/`, `assets/`
  - Task dependencies: build (depends on `^build`), test (depends on `build`), check/lint/type-check (depend on `^build`)

**Code Quality:**

- `.oxlintrc.json` - Oxlint rules (TypeScript plugin, correctness/suspicious as errors)
- `.oxfmtrc.jsonc` - Oxfmt rules (80-char line width, 2-space indent, trailing commas, sort imports)
- `commitlint.config.js` - Extends `@commitlint/config-conventional` (conventional commits)
- `.lintstagedrc.mjs` - Pre-commit hook script (lint + format staged files)

**Package Management:**

- `package.json` (root) with `pnpm` workspaces
- `packageManager: "pnpm@10.13.1"` in root `package.json`
- All internal dependencies use `workspace:*` protocol

## Platform Requirements

**Development:**

- Node.js 22.17.0+
- pnpm 10.13.1+
- Git (for version control, commit hooks)
- gh CLI (GitHub API access via `gh api graphql`, used in `packages/cli/src/commands/repo/pr-comments/`)
- Bash (for build scripts)

**Production:**

- Node.js 22.17.0+ (CLI runtime)
- Next.js 16.1.6 deployment target (docs app, `apps/oat-docs/`)
- Deployed docs accessible at `https://voxmedia.github.io/open-agent-toolkit/`

---

_Stack analysis: 2026-05-17_
