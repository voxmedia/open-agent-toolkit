---
oat_generated: true
oat_generated_at: 2026-01-28
oat_source_head_sha: d3e8f0286044a5da390c8c0a6a870eb0d1e3b391
oat_source_main_merge_base_sha: c8226d8b03ab10dd8a45097fab58277fba418693
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.8.3 - All source code
- JavaScript (ES Modules) - Build configuration and scripts

**Secondary:**
- Shell/Bash - Git hooks and utility scripts
- Markdown - Documentation and skill definitions
- YAML - GitHub Actions workflows

## Runtime

**Environment:**
- Node.js 22.17.0+ (specified in .nvmrc)
- ES2022 target with ESM modules

**Package Manager:**
- pnpm 10.13.1+
- Lockfile: pnpm-lock.yaml

## Frameworks

**Core:**
- Turborepo 2.7.6 - Monorepo build orchestration
- TypeScript 5.8.3 - Type system and compilation

**Build/Dev Tools:**
- tsx 4.21.0 - Direct TypeScript execution
- tsc-alias 1.8.10 - Path alias resolution
- Biome 2.3.11 - Linting and formatting

## Key Dependencies

**Development:**
- @biomejs/biome - Code quality
- @commitlint/cli + config-conventional - Commit linting
- lint-staged - Pre-commit hook runner
- @types/node - TypeScript definitions

**Build:**
- turbo - Task orchestration
- typescript - Compilation
- tsc-alias - Path resolution

## Configuration

**TypeScript (tsconfig.json):**
- Target: ES2022
- Module: ESNext
- Module Resolution: bundler
- Strict: true
- noUncheckedIndexedAccess: true
- verbatimModuleSyntax: true

**Biome (biome.json):**
- Linting: Error level for most rules
- Formatting: 2-space indent, 80 char lines, LF endings
- Single quotes, trailing commas, always semicolons

**Turborepo (turbo.json):**
- Build task with dependency ordering
- Type-check, lint, format tasks
- Clean task for dist removal

## Build System

**Commands:**
- `pnpm build` - Build all packages
- `pnpm dev` - Watch mode development
- `pnpm type-check` - TypeScript validation
- `pnpm lint` / `pnpm lint:fix` - Code linting
- `pnpm format` / `pnpm format:fix` - Code formatting
- `pnpm test` - Run tests (infrastructure ready)
- `pnpm clean` - Remove build artifacts

**Output:**
- Compiled to `dist/` directories
- Declaration files generated
- Path aliases resolved post-build

## Platform Requirements

**Development:**
- Node.js 22.17.0+
- pnpm 10.13.1+
- macOS, Linux, or Windows with bash

---

*Stack analysis: 2026-01-28*
