---
oat_generated: true
oat_generated_at: 2026-08-30
oat_source_head_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_source_main_merge_base_sha: 5d684ba9746cd91006524eb5a82f18078a3196ef
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Technology Stack

**Analysis Date:** 2026-08-30

## Languages

**Primary:**

- TypeScript 6 through the `typescript` npm alias and TypeScript 7 compatibility dependency — application, CLI, packages, and tests under `packages/**/src/**/*.ts`; versions are pinned in `package.json` and each workspace package manifest.
- TypeScript with JSX/TSX — React documentation components in `apps/oat-docs/components/search.tsx`, `apps/oat-docs/app/layout.tsx`, and `packages/docs-theme/src/*.tsx`.

**Secondary:**

- JavaScript ESM — Next.js configuration and repository tooling in `apps/oat-docs/next.config.js`, `commitlint.config.js`, and `tools/**/*.mjs`.
- Shell — build, worktree, and Git-hook scripts in `packages/cli/scripts/bundle-assets.sh`, `scripts/worktree/init.sh`, and `tools/git-hooks/*.sh`.
- Markdown and YAML — documentation/assets in `apps/oat-docs/docs/**/*.md` and workflow configuration in `.github/workflows/*.yml`.

## Runtime

**Environment:**

- Node.js 22.17.0 for development, recorded in `.nvmrc`; package manifests require Node `>=22.17.0` in `package.json` and `packages/*/package.json`.
- ESM modules: root `package.json` and all published package manifests set `"type": "module"`.

**Package Manager:**

- pnpm 10.13.1, declared by `package.json` (`packageManager`) and used by the workspace definitions in `pnpm-workspace.yaml`.
- Lockfile: present as `pnpm-lock.yaml` with lockfile format version 9.

## Frameworks

**Core:**

- Commander 12.1 — CLI command parsing for `@open-agent-toolkit/cli`, declared in `packages/cli/package.json`.
- Zod 3.25 — runtime schema validation in the CLI, declared in `packages/cli/package.json`.
- Next.js 16.1 with React 19.1 — static documentation application under `apps/oat-docs/`, declared in `apps/oat-docs/package.json`.
- Fumadocs 16.10/14.3 — documentation content, MDX build, UI, and search in `apps/oat-docs/source.config.ts`, `apps/oat-docs/app/api/search/route.ts`, and `apps/oat-docs/package.json`.
- Tailwind CSS 4.2 — documentation styling through `@tailwindcss/postcss` in `apps/oat-docs/postcss.config.mjs` and `apps/oat-docs/package.json`.

**Testing:**

- Vitest 4.0 — unit and integration tests in `packages/cli/vitest.config.ts`, `packages/docs-config/vitest.config.ts`, and workspace `test` scripts.
- Node's built-in test runner — smoke and release suites in `tools/smoke/**/*.test.mjs` and `tools/release/*.test.mjs`, invoked by root `package.json` scripts.
- Playwright 1.51 — browser-oriented test support, declared in root `package.json`.

**Build/Dev:**

- Turborepo 2.7 — workspace task orchestration in `turbo.json` and root `package.json` scripts.
- TypeScript compiler and `tsc-alias` — package build output and alias rewriting in `packages/cli/package.json` and `packages/control-plane/package.json`.
- tsx 4.21 — direct TypeScript execution for the CLI and development commands in root `package.json` and `packages/cli/package.json`.
- oxc tools — `oxlint`, `oxlint-tsgolint`, and `oxfmt` enforce linting/formatting via `.oxlintrc.json`, `.oxfmtrc.jsonc`, and root `package.json`.

## Key Dependencies

**Critical:**

- `@open-agent-toolkit/cli` 0.2.47 — published Node CLI package with the `oat` binary, defined in `packages/cli/package.json`.
- `@open-agent-toolkit/control-plane` 0.2.47 — read-only structured project-state library consumed by the CLI through its workspace dependency in `packages/cli/package.json`.
- `yaml` 2.8.2 — YAML parsing/serialization for the CLI and control-plane, declared in `packages/cli/package.json` and `packages/control-plane/package.json`.
- `@iarna/toml` 2.2.5 and `jsonc-parser` 3.2.1 — TOML and JSONC support in the CLI, declared in `packages/cli/package.json`.
- `@inquirer/prompts` 8.2 and `ora` 9 — interactive CLI prompts and terminal progress UI, declared in `packages/cli/package.json`.

**Infrastructure:**

- `@open-agent-toolkit/docs-config`, `docs-theme`, and `docs-transforms` 0.2.47 — reusable configuration, UI, and remark transforms consumed by `apps/oat-docs/package.json`.
- `unified` 11, `remark-parse` 11, `unist-util-visit` 5, and `remark-github-blockquote-alert` 2 — Markdown/remark transformation stack in `packages/docs-config/package.json` and `packages/docs-transforms/package.json`.
- `flexsearch` 0.8 — static documentation search configuration in `packages/docs-config/src/search-config.ts` and `packages/docs-config/package.json`.
- `mermaid` 11.6 and `next-themes` 0.4 — diagram rendering and UI theme support in `packages/docs-theme/package.json`.

## Configuration

**Environment:**

- Repo and user configuration is file-backed under `.oat/`; CLI configuration types and readers are defined in `packages/cli/src/config/oat-config.ts`.
- Optional runtime overrides include `OAT_ASSETS_DIR` in `packages/cli/src/fs/assets.ts`, `OAT_PROJECTS_ROOT` in `packages/cli/src/commands/shared/oat-paths.ts`, and `OAT_PROJECTS_DEFAULT_SCOPE` in `packages/cli/src/commands/shared/project-scope.ts`.
- The docs app has a fixed GitHub Pages base path in `apps/oat-docs/next.config.js`; generated docs index refresh is part of its `predev` and `prebuild` scripts in `apps/oat-docs/package.json`.
- Local-only configuration: `.mcp.json` is ignored by `.gitignore`; `.claude/settings.local.json` is ignored by the configured global Git excludes file, as shown by `git check-ignore` in this checkout.

**Build:**

- Shared TypeScript compiler rules, including strict mode and ES2022 target, are in `tsconfig.json`.
- Turborepo task dependencies, cache outputs, and global skill-asset dependency tracking are in `turbo.json`.
- Documentation exports are static, with trailing slashes and unoptimized images, in `packages/docs-config/src/next-config.ts`; `apps/oat-docs/next.config.js` applies the `/open-agent-toolkit` base path.
- CI resolves the Node version from `.nvmrc`, enables pnpm through Corepack, and caches the pnpm store via `.github/actions/setup-pnpm/action.yml`.

## Platform Requirements

**Development:**

- Node.js 22.17.0 and pnpm 10.13.1 are the declared baseline in `.nvmrc` and `package.json`; `pnpm install --frozen-lockfile` is the CI install command in `.github/workflows/ci.yml`.
- Git is invoked by CLI project, sync, review, and validation functions such as `packages/cli/src/commands/project/sync/git.ts` and `packages/cli/src/validation/skills.ts`.
- Optional provider command-line programs are probed or invoked through `packages/cli/src/providers/identity/availability.ts` and `packages/cli/src/config/oat-config.ts`: `codex`, `claude`, and `cursor-agent`.

**Production:**

- The docs app is built as a static export (`output: 'export'`) by `packages/docs-config/src/next-config.ts` and deployed to GitHub Pages by `.github/workflows/deploy-docs.yml`.
- Five public packages are packed and published to npm by `.github/workflows/release.yml`: CLI, control-plane, docs-config, docs-theme, and docs-transforms.

---

_Stack analysis: 2026-08-30_
