---
oat_generated: true
oat_generated_at: 2026-08-19
oat_source_head_sha: e0408f4676a7b84e4240b4c568b78265f1d5cd0a
oat_source_main_merge_base_sha: 6f443c0843d75b704168b8ca739b5bcf7f406f07
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

<!--
Vendored from: https://github.com/glittercowboy/get-shit-done
License: MIT
Original: agents/gsd-codebase-mapper.md (embedded template)
Modified: 2026-01-27 - Adapted for OAT (added frontmatter)
-->

# Technology Stack

**Analysis Date:** 2026-08-19

## Languages

**Primary:**

- TypeScript 6/7 compiler aliases - CLI, control-plane, docs configuration/theme/transform packages, and the Next.js docs app (`tsconfig.json`, `packages/cli/package.json`, `apps/oat-docs/tsconfig.json`).
- JavaScript ESM - package configuration, tooling, release scripts, and smoke harnesses (`package.json`, `tools/smoke/runner/run-smoke.mjs`, `apps/oat-docs/next.config.js`).

**Secondary:**

- Bash - CLI asset bundling, Git hooks, worktree setup, and archive synchronization (`packages/cli/scripts/bundle-assets.sh`, `tools/git-hooks/pre-commit`, `scripts/sync-archived-projects-from-s3.sh`).
- MDX/Markdown and CSS - documentation content, generated indexes, and docs presentation (`apps/oat-docs/docs`, `apps/oat-docs/index.md`, `apps/oat-docs/app/globals.css`).

## Runtime

**Environment:**

- Node.js >=22.17.0 for repository development and published CLI packages (`.nvmrc`, `package.json`, `packages/cli/package.json`).
- Node.js 24 in the npm release job for trusted publishing (`.github/workflows/release.yml`).

**Package Manager:**

- pnpm 10.13.1 with a workspace lockfile (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`).
- Lockfile: present (`pnpm-lock.yaml`).

## Frameworks

**Core:**

- Commander 12.1.x - CLI command routing (`packages/cli/package.json`, `packages/cli/src/app/create-program.ts`).
- Next.js 16.1.x and React 19.1+ - the `apps/oat-docs` documentation web application (`apps/oat-docs/package.json`, `apps/oat-docs/next.config.js`).
- Fumadocs Core/UI/MDX 16.10.x/14.3.x - MDX source loading, docs layouts, and static search (`apps/oat-docs/package.json`, `apps/oat-docs/source.config.ts`, `packages/docs-theme/package.json`).

**Testing:**

- Vitest 4.0.x - TypeScript package unit/integration tests (`packages/cli/package.json`, `packages/cli/vitest.config.ts`, `packages/control-plane/package.json`).
- Node.js built-in test runner - JavaScript smoke, release, and skill tests (`package.json`, `tools/smoke/runner/run-smoke.test.mjs`).
- Playwright Test 1.51.x - development dependency for browser-oriented test coverage (`package.json`).

**Build/Dev:**

- Turborepo 2.7.x - workspace build, check, test, lint, format, and type-check orchestration (`turbo.json`, `package.json`).
- TypeScript with `tsc-alias` - strict ESM compilation to package `dist/` output (`tsconfig.json`, `packages/cli/tsconfig.json`, `packages/control-plane/tsconfig.json`).
- `tsx` 4.21.x - direct TypeScript execution for CLI and repository tools (`package.json`, `packages/cli/package.json`).
- oxlint/oxlint-tsgolint and oxfmt - linting, type-aware linting, and formatting (`.oxlintrc.json`, `.oxfmtrc.jsonc`, `package.json`).

## Key Dependencies

**Critical:**

- `zod` 3.25.x - runtime validation used by the CLI (`packages/cli/package.json`).
- `yaml` 2.8.2, `@iarna/toml` 2.2.5, and `jsonc-parser` 3.2.1 - configuration and structured-file parsing (`packages/cli/package.json`, `packages/cli/src/config`).
- `@open-agent-toolkit/control-plane` - workspace library for structured project state consumed by the CLI (`packages/cli/package.json`, `packages/control-plane/package.json`).
- `inquirer/prompts`, `commander`, `chalk`, and `ora` - interactive command input, command definitions, terminal styling, and progress UI (`packages/cli/package.json`).

**Infrastructure:**

- `unified`, remark plugins, and `unist-util-visit` - documentation transforms (`packages/docs-transforms/package.json`, `packages/docs-transforms/src`).
- `flexsearch` - static documentation search indexing (`packages/docs-config/package.json`, `packages/docs-config/src/search-config.ts`).
- `mermaid` and `next-themes` - diagram rendering and theme switching in shared docs components (`packages/docs-theme/package.json`, `packages/docs-theme/src`).
- `@tailwindcss/postcss` and Tailwind CSS 4 - docs app styling pipeline (`apps/oat-docs/package.json`, `apps/oat-docs/postcss.config.mjs`).

## Configuration

**Environment:**

- Shared OAT behavior is configured in `.oat/config.json`; checkout-local active project state is in `.oat/config.local.json` (`.oat/config.json`, `.oat/config.local.json`).
- Provider synchronization is configured for Claude, Cursor, and Codex in `.oat/sync/config.json` and materialized in `.oat/sync/manifest.json` (`.oat/sync/config.json`, `.oat/sync/manifest.json`).
- No checked-in `.env` file is present; conditional credentials are read from process environment or provider CLIs (`tools/smoke/runner/cursor-broker-launch.mjs`, `packages/cli/src/commands/project/archive/archive-utils.ts`).

**Build:**

- Root compiler defaults and strict ESM/bundler settings are in `tsconfig.json`; package-specific output/declaration settings are in package `tsconfig.json` files (`tsconfig.json`, `packages/cli/tsconfig.json`, `packages/docs-config/tsconfig.json`).
- Turborepo task dependencies and outputs are declared in `turbo.json`; the docs Next.js base path is configured in `apps/oat-docs/next.config.js` (`turbo.json`, `apps/oat-docs/next.config.js`).

## Platform Requirements

**Development:**

- Node.js and pnpm matching the repository engines are required for workspace scripts (`package.json`, `.nvmrc`).
- The optional archive path requires the AWS CLI and configured AWS access; PR-comment collection requires the GitHub CLI (`scripts/sync-archived-projects-from-s3.sh`, `packages/cli/src/commands/project/archive/archive-utils.ts`, `packages/cli/src/commands/repo/pr-comments/collect/collect-comments.ts`).
- Provider smoke scenarios invoke `codex`, `claude`, `cursor`, or `cursor-agent` depending on harness (`tools/smoke/runner/drive.mjs`, `tools/smoke/runner/preflight.mjs`).

**Production:**

- The docs application is built and deployed as a GitHub Pages artifact (`.github/workflows/deploy-docs.yml`, `apps/oat-docs/next.config.js`).
- Five public `@open-agent-toolkit/*` packages are built and published to npm by GitHub Actions (`.github/workflows/release.yml`, `packages/cli/package.json`).

---

_Stack analysis: 2026-08-19_
