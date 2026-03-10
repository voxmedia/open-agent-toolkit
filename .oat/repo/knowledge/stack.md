---
oat_generated: true
oat_generated_at: 2026-02-16
oat_source_head_sha: 72b568a6cc88d2ce2b3889de3b904b7dd73e9d8d
oat_source_main_merge_base_sha: a80661894616fc9323542a4bcbcc22c08917e440
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Technology Stack

**Analysis Date:** 2026-02-16

## Languages

**Primary:**

- TypeScript 5.8.3 - Core application code across all packages
- JavaScript (ES modules) - Configuration and build tooling
- Shell/Bash - Git hooks and utility scripts

**Secondary:**

- YAML - GitHub Actions workflows, configuration files
- JSON - Configuration, package manifests, lockfiles
- Markdown - Documentation

## Runtime

**Environment:**

- Node.js 22.17.0 (minimum required, specified in `.nvmrc` and `package.json`)
- Runtime type: ES modules (`"type": "module"` across all packages)

**Package Manager:**

- pnpm 10.13.1 (workspace manager)
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core CLI:**

- Commander 12.1.0 - CLI framework for command structure and option parsing
- Zod 3.25.76 - Schema validation and runtime type-checking for configs and manifests

**UI/Output:**

- Chalk 5.6.2 - Terminal string styling and colors
- Ora 9.0.0 - Elegant terminal spinner/loader
- @inquirer/prompts 8.2.0 - Interactive command-line prompts

**Build/Dev:**

- Turbo 2.7.6 - Monorepo task orchestration and caching
- tsx 4.21.0 - Direct TypeScript execution with hot reload support
- tsc-alias 1.8.10 - TypeScript path alias resolution for compiled output

**Testing:**

- Vitest 4.0.18 - Unit test framework with TypeScript support

**Linting/Formatting:**

- oxlint - High-performance JavaScript/TypeScript linter (Rust-based, ESLint-compatible)
  - Configured via `.oxlintrc.json` in repository root
- oxfmt - High-performance code formatter (Rust-based, Prettier-compatible)
  - Configured via `.oxfmtrc.jsonc` in repository root

**Commit/Git:**

- commitlint 19.8.1 - Git commit message linting
- lint-staged 15.2.11 - Pre-commit hook file linting

## Key Dependencies

**Critical:**

- zod 3.25.76 - Runtime validation for manifest schemas, sync configs, and provider adapters
- commander 12.1.0 - CLI command parsing and execution
- @inquirer/prompts 8.2.0 - Interactive setup and configuration flows
- chalk 5.6.2 - Colored console output for user feedback
- ora 9.0.0 - Visual progress indication during sync and build operations

**Infrastructure:**

- Turbo 2.7.6 - Enables parallel package builds, caching, and dependency graph computation
- tsx 4.21.0 - TypeScript execution without manual compilation steps
- tsc-alias 1.8.10 - Rewrites TypeScript path aliases in compiled JavaScript

**Development:**

- oxlint - Fast linter with 690+ rules, ESLint-compatible
- oxfmt - Fast formatter, Prettier-compatible (beta)
- @types/node 22.10.0 - Node.js type definitions
- Vitest 4.0.18 - Fast unit testing with zero-config TypeScript support

## Configuration

**Environment:**

- Configuration loaded from JSON files (sync config, manifests)
- No .env files used; configuration is file-based
- CLI supports `--json`, `--verbose`, `--scope <scope>`, and `--cwd <path>` flags
- Interactive prompts via @inquirer/prompts for user input during `init` and `adopt` commands

**Build:**

- `tsconfig.json` - Strict TypeScript compilation settings
  - Target: ES2022
  - Module resolution: bundler
  - ESNext modules with strict null checks
- `vitest.config.ts` - Test framework aliases
- `turbo.json` - Task definitions and caching configuration
- `.oxlintrc.json` - Linting rules (oxlint)
- `.oxfmtrc.jsonc` - Formatting settings (oxfmt)
- `pnpm-workspace.yaml` - Workspace root configuration

**Key TypeScript Compilation Options:**

- `strict: true` - Enable strict type checking
- `noEmit: false` - Emit compiled `.js` and `.d.ts` files to `dist/`
- `verbatimModuleSyntax: true` - Preserve import/export syntax exactly
- `isolatedModules: true` - Each file is independently transpilable
- Output directory: `dist/` (relative to each package)

## Platform Requirements

**Development:**

- Operating System: Linux, macOS, Windows (via Git Bash)
- Node.js version: >=22.17.0
- pnpm version: >=10.13.1
- Workspace dependencies: Uses `workspace:*` for internal package linking

**Production:**

- Deployment target: Node.js 22.17.0+
- Output: Compiled JavaScript in `dist/` directories
- CLI executable: `packages/cli/dist/index.js` (configured as `bin.oat` in package.json)
- Architecture: Cross-platform (tested on Darwin/macOS, Linux for CI)

**CI/CD:**

- Platform: GitHub Actions (Ubuntu latest for CI workflow)
- Build steps: check → type-check → test → build
- Caching: pnpm cache leveraged in CI pipeline

---

_Stack analysis: 2026-02-16_
