---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Technology Stack

**Analysis Date:** 2026-03-24

## Languages

**Primary:**

- TypeScript 5.8.x/5.9.x workspace-wide for CLI, libraries, and docs app
- Markdown for docs content, workflow artifacts, and skill definitions

**Secondary:**

- Shell scripts for asset bundling and OAT tracking utilities
- JSON/TOML/YAML for package metadata, provider config, and workflow state

## Runtime

**Environment:**

- Node.js `>=22.17.0`

**Package Manager:**

- pnpm `10.13.1`
- Lockfile: `pnpm-lock.yaml` present

## Frameworks

**Core:**

- Turborepo `^2.7.6` - workspace task orchestration
- Commander `^12.1.0` - CLI command parsing
- Zod `^3.25.x` - runtime validation
- Next `^16.1.6` - docs application
- React `^19.1.0` - docs UI
- Fumadocs `^16.x` / `^14.x` - docs framework and MDX integration

**Testing:**

- Vitest `^4.0.18` across CLI and library packages

**Build/Dev:**

- TypeScript compiler + `tsc-alias`
- `tsx` for direct TypeScript execution in development
- `oxlint` and `oxfmt` for linting/formatting

## Key Dependencies

**Critical:**

- `commander`, `chalk`, `ora`, `yaml`, `@iarna/toml`, `@inquirer/prompts` in the CLI
- `fumadocs-*`, `next`, `react`, `react-dom` in the docs system
- `unified`, `remark-parse`, `unist-util-visit`, `remark-github-blockquote-alert` in docs processing

**Infrastructure:**

- `mermaid` for docs diagrams
- `flexsearch` for static docs search
- GitHub Actions for CI and docs deployment

## Configuration

**Environment:**

- Root package scripts drive most workflows.
- Repo behavior is configured through `package.json`, `turbo.json`, `tsconfig.json`, `.oxlintrc.json`, `.oxfmtrc.jsonc`, `.oat/**`, and provider config files.

**Build:**

- Root `build` excludes `oat-docs`; `build:docs` handles the docs app and its dependencies.
- `packages/cli` build includes an asset-bundling shell step before TypeScript compilation.

## Platform Requirements

**Development:**

- Modern Node 22 environment
- pnpm workspace support
- git available in PATH for many OAT commands and scripts

**Production:**

- CLI: Node runtime with local filesystem access
- Docs app: static export suitable for GitHub Pages

## Repo Shape

- Private root workspace package
- One executable CLI package: `packages/cli`
- Three reusable docs packages: `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`
- One reference docs app: `apps/oat-docs`

---

_Stack analysis: 2026-03-24_
