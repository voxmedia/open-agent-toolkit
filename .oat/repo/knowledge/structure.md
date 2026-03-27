---
oat_generated: true
oat_generated_at: 2026-03-24
oat_source_head_sha: 539d8ac2b1ba2d2315bac69753ded87509967c6b
oat_source_main_merge_base_sha: 146eed87a123f0b31d60726a4acfd6d7c83d1478
oat_warning: 'GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index'
---

# Codebase Structure

**Analysis Date:** 2026-03-24

## Directory Layout

```text
open-agent-toolkit/
├── .agents/                 # Canonical skills, agents, rules, and docs
├── .oat/                    # Workflow state, templates, repo knowledge, tracking
├── .github/workflows/       # CI and docs deployment automation
├── apps/oat-docs/           # Reference Fumadocs application
├── packages/cli/            # OAT CLI runtime, tests, bundled assets
├── packages/docs-config/    # Docs config factories
├── packages/docs-theme/     # Shared docs UI components
├── packages/docs-transforms/# Shared remark/unified plugins
└── tools/git-hooks/         # Git hook setup helpers
```

## Directory Purposes

**`.agents/`:**

- Purpose: canonical source for reusable skills, agents, and supporting docs
- Contains: `SKILL.md` directories, provider docs, agent markdown
- Key files: `.agents/skills/*/SKILL.md`, `.agents/agents/*.md`

**`.oat/`:**

- Purpose: OAT project lifecycle and repo-level metadata
- Contains: project artifacts, repo knowledge, templates, tracking, scripts
- Key files: `.oat/state.md`, `.oat/projects/**`, `.oat/repo/knowledge/**`

**`packages/cli/`:**

- Purpose: main executable and repo automation logic
- Contains: TypeScript source, tests, bundled assets, build script
- Key files: `packages/cli/src/index.ts`, `packages/cli/scripts/bundle-assets.sh`

**`packages/docs-config/`, `packages/docs-theme/`, `packages/docs-transforms/`:**

- Purpose: reusable docs libraries
- Contains: package-local source and tests
- Key files: each package `src/index.ts` plus focused modules per concern

**`apps/oat-docs/`:**

- Purpose: first-party documentation site
- Contains: Next app files, docs content, source loader, static site config
- Key files: `apps/oat-docs/package.json`, `apps/oat-docs/source.config.ts`, `apps/oat-docs/app/layout.tsx`

## Key File Locations

**Entry Points:**

- `packages/cli/src/index.ts`: CLI entrypoint
- `packages/docs-config/src/index.ts`: docs-config library export surface
- `packages/docs-theme/src/index.ts`: docs-theme library export surface
- `packages/docs-transforms/src/index.ts`: docs-transforms library export surface
- `apps/oat-docs/app/layout.tsx`: docs app root layout

**Configuration:**

- `package.json`: root scripts and workspace metadata
- `pnpm-workspace.yaml`: workspace package registration
- `turbo.json`: Turbo task graph
- `tsconfig.json`: root TypeScript defaults
- `.github/workflows/*.yml`: CI and docs deployment

**Core Logic:**

- `packages/cli/src/commands/`: command implementations
- `packages/cli/src/engine/`: sync and workflow execution logic
- `packages/cli/src/providers/`: provider adapters
- `packages/docs-*/src/`: docs toolkit logic

**Testing:**

- Co-located in package `src/` trees with `.test.ts` suffix
- No dedicated app-level test suite currently visible under `apps/oat-docs`

## Naming Conventions

**Files:**

- TypeScript modules use descriptive lowercase names, usually kebab-case.
- Tests mirror the implementation filename with `.test.ts`.

**Directories:**

- Workspace packages live under `packages/` and apps under `apps/`.
- Canonical content uses stable top-level names like `.agents`, `.oat`, `.github`.

## Where to Add New Code

**New CLI feature:**

- Primary code: `packages/cli/src/commands/` and supporting modules under `packages/cli/src/`
- Tests: nearby `*.test.ts` files in the same package

**New docs toolkit feature:**

- Implementation: the relevant `packages/docs-*` package
- Consumer verification: `apps/oat-docs/`

**New workflow or skill artifact:**

- Canonical content: `.agents/skills/` or `.oat/templates/`
- Bundled consumption path: rebuilt into `packages/cli/assets/`

## Special Directories

**`packages/cli/assets/`:**

- Purpose: bundled copy of repo-owned skills, templates, docs, and scripts
- Generated: Yes
- Committed: No

**`packages/cli/dist/`:**

- Purpose: compiled CLI output
- Generated: Yes
- Committed: No

**`.oat/repo/knowledge/`:**

- Purpose: generated repo knowledge artifacts
- Generated: Yes
- Committed: Yes

---

_Structure analysis: 2026-03-24_
