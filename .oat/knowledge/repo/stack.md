---
oat_generated: true
oat_generated_at: 2026-02-02
oat_source_head_sha: d25643fb7a57fd977d1a9590690d26986d2d0ce8
oat_source_main_merge_base_sha: 6c147615ba8cf567d29814f1fe1d5667fc6e6fdf
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.8.3 - All source code, CLI, scripts, and type definitions
- JavaScript (Node.js) - Git hooks and configuration scripts

**Secondary:**
- YAML - Configuration files (workflows, workspace config)
- JSON - Package manifests and configuration

## Runtime

**Environment:**
- Node.js 22.17.0 (specified in .nvmrc)

**Package Manager:**
- pnpm 10.13.1 - Monorepo package management with workspaces
- Lockfile: pnpm-lock.yaml (present)

## Frameworks

**Core:**
- Turborepo 2.7.6 - Monorepo build orchestration and caching
- ESM (ES Modules) - Module system across all packages ("type": "module")

**Development:**
- tsx 4.21.0 - TypeScript execution with watch mode
- tsc-alias 1.8.10 - Path alias resolution for compiled TypeScript

**Linting & Formatting:**
- Biome 2.3.11 - Unified linting and code formatting
- commitlint 19.8.1 - Git commit message validation
- lint-staged 15.2.11 - Pre-commit hooks for staged files

## Key Dependencies

**Development Tools:**
- @types/node ^22.10.0 - TypeScript definitions for Node.js APIs
- @biomejs/biome 2.3.11 - Fast JavaScript/TypeScript linter and formatter
- @commitlint/cli ^19.8.1 - Commit message linting
- @commitlint/config-conventional ^19.8.1 - Conventional commits config
- turbo ^2.7.6 - Monorepo build system
- tsx ^4.21.0 - TypeScript executor for Node.js

**No Runtime Dependencies:**
- Root package has no production dependencies
- All utilities are development-time tools

## Configuration

**Environment:**
- Git hooks for pre-commit, commit-msg, pre-push, and post-checkout
- Environment variables loaded via process.env (Node.js standard)
- No external .env files required for base functionality

**Build:**
- turbo.json - Task graph configuration with output caching
- tsconfig.json - Root TypeScript configuration with strict mode enabled
- biome.json - Linting and formatting rules
- pnpm-workspace.yaml - Monorepo workspace definitions

**Project Structure:**
- pnpm workspaces with packages under `apps/` and `packages/` directories
- Turborepo task dependencies for efficient parallel builds

## TypeScript Configuration

- **Target:** ES2022
- **Module System:** ESNext with bundler resolution
- **Strict Mode:** Enabled
- **Features:**
  - Strict null checks
  - No unchecked indexed access
  - No implicit overrides
  - Implicit returns enforced
  - Fallthrough case checks
  - No unchecked side-effect imports
  - Verbatim module syntax

## Code Quality Standards

**Linting (Biome):**
- Recommended rule set enabled
- All correctness rules set to "error"
- Style rules: const enforcement, template literal usage
- Complexity checks: no useless catch/type constraints
- Suspicious patterns: double equals, missing null checks, etc.
- Test files: relaxed any type checking

**Formatting (Biome):**
- Line width: 80 characters
- Indentation: 2 spaces
- Line endings: LF
- Semicolons: Always
- Quotes: Single (JavaScript/JSON)
- Trailing commas: All
- Arrow parentheses: Always

**Commit Messages:**
- Conventional Commits format enforced via commitlint
- Angular preset with scope, type, and description

## Platform Requirements

**Development:**
- Node.js >=22.17.0
- pnpm >=10.13.1
- macOS, Linux, or Windows with Git

**Production:**
- CLI is distributed as standalone package (@oat/cli)
- Can be invoked via `npx openskills` or direct Node.js execution

---

*Stack analysis: 2026-02-02*