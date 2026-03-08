---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-03-08
oat_generated: false
oat_template: false
---

# Design: docs-framework-migration

## Overview

This design introduces three new packages to the OAT monorepo (`docs-config`, `docs-transforms`, `docs-theme`) that together provide a Fumadocs-based documentation platform. Consumer repos scaffold a thin Next.js app via `oat docs init` that imports everything from these packages — authors write plain markdown and get a polished, statically-exported docs site.

The CLI gains two new commands: `oat docs migrate` for one-time MkDocs-to-GFM syntax conversion, and `oat docs index generate` for producing an index artifact from the file tree. The existing `oat docs init` command adds a framework choice prompt while preserving MkDocs as an option.

The architecture follows a "thin scaffold, heavy packages" pattern — all framework complexity is encapsulated in shared packages so upgrades are version bumps, not re-scaffolds.

## Architecture

### System Context

The docs platform sits within OAT's existing monorepo structure alongside the CLI and biome-config packages. Consumer repos interact with it at two levels:

1. **Scaffold time** — `oat docs init` generates a thin app shell that depends on the shared packages
2. **Build time** — the shared packages handle all Fumadocs wiring, markdown transforms, and theming

The CLI commands (`migrate`, `index generate`) operate on the consumer's `docs/` directory and `.oat/config.json` — they are framework-aware but content-agnostic.

**Key Components:**
- **`@oat/docs-config`** — Fumadocs MDX config, Next.js config factory, plugin wiring, FlexSearch setup
- **`@oat/docs-transforms`** — Remark AST transforms for non-standard markdown syntax
- **`@oat/docs-theme`** — Layout components, page components, Mermaid renderer, configurable branding
- **CLI: scaffold templates** — Fumadocs app template set (alongside existing MkDocs templates)
- **CLI: `docs migrate`** — One-time codemod command
- **CLI: `docs index generate`** — Docs surface index generator

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│  OAT Monorepo                                           │
│                                                         │
│  packages/                                              │
│  ├── cli/                                               │
│  │   ├── src/commands/docs/                             │
│  │   │   ├── init/        (scaffold, framework choice)  │
│  │   │   ├── migrate/     (codemod command)             │
│  │   │   └── index/       (index generate command)      │
│  │   └── assets/templates/                              │
│  │       ├── docs-app-mkdocs/    (renamed from docs-app/) │
│  │       └── docs-app-fuma/     (new Fumadocs)          │
│  ├── docs-config/         (@oat/docs-config)            │
│  ├── docs-transforms/     (@oat/docs-transforms)        │
│  └── docs-theme/          (@oat/docs-theme)             │
│                                                         │
└─────────────────────────────────────────────────────────┘

         │ oat docs init (fumadocs)
         ▼

┌─────────────────────────────────────────────────────────┐
│  Consumer Repo (scaffolded)                             │
│                                                         │
│  apps/docs/                                             │
│  ├── next.config.js      → imports @oat/docs-config     │
│  ├── source.config.ts    → imports @oat/docs-config     │
│  ├── app/layout.tsx      → imports @oat/docs-theme      │
│  ├── app/[[...slug]]/    → imports @oat/docs-theme      │
│  │   └── page.tsx                                       │
│  ├── index.md              (generated docs index, not authored) │
│  ├── package.json                                       │
│  └── docs/               (plain markdown)               │
│      ├── index.md                                       │
│      ├── getting-started.md                             │
│      └── contributing.md                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Build-time content pipeline:**

```
docs/*.md (authored markdown)
  │
  ├─ @oat/docs-transforms
  │   └─ remark-tabs: === "Tab" → <Tabs>/<Tab> JSX nodes
  │
  ├─ @oat/docs-config (pre-wired plugins)
  │   ├─ remarkMdxMermaid: ```mermaid → <Mermaid> component
  │   ├─ remark-github-blockquote-alert: > [!NOTE] → styled alert HTML
  │   └─ Fumadocs default plugins (GFM, TOC, etc.)
  │
  ├─ Fumadocs MDX compiler
  │   └─ Produces React components from MDX AST
  │
  ├─ @oat/docs-theme
  │   ├─ Layout wrapper (nav, sidebar, footer)
  │   ├─ Page component (content area, TOC)
  │   └─ Mermaid React component (client-side render)
  │
  └─ Next.js static export
      └─ out/ (HTML, CSS, JS, search index)
```

**Index generation flow:**

```
docs/*.md (file tree + frontmatter)
  │
  ├─ oat docs index generate
  │   ├─ Walk directory tree
  │   ├─ Read frontmatter (title, description)
  │   ├─ Fallback: first # heading → filename title-case
  │   └─ Write index.md at docs app root (not inside docs/)
  │
  └─ Update .oat/config.json documentation.index
```

## Component Design

### @oat/docs-config

**Purpose:** Encapsulate all Fumadocs framework configuration so consumer repos don't touch it.

**Responsibilities:**
- Export `createDocsConfig()` — Next.js config factory with static export, image settings
- Export `createSourceConfig()` — Fumadocs MDX content source with all remark/rehype plugins wired
- Wire `remarkMdxMermaid` from `fumadocs-core`
- Wire `remark-github-blockquote-alert` for GFM blockquote callouts (`> [!NOTE]`, `> [!WARNING]`, etc.)
- Wire transforms from `@oat/docs-transforms`
- Configure FlexSearch for static export

**Interfaces:**

```typescript
interface DocsConfigOptions {
  title: string;
  description?: string;
  logo?: string;
}

export function createDocsConfig(options: DocsConfigOptions): NextConfig;

export function createSourceConfig(): FumadocsSourceConfig;
```

**Dependencies:**
- `fumadocs-core` — MDX plugins, search
- `fumadocs-mdx` — content source
- `next` — config types
- `@oat/docs-transforms` — custom remark transforms
- `remark-github-blockquote-alert` — GFM blockquote callout syntax (`> [!NOTE]`)
- `flexsearch` — client-side search

**Design Decisions:**
- Config factory pattern rather than raw config export — allows consumer to pass options while we own the structure
- Plugins are pre-wired, not opt-in — every docs site gets the same transform pipeline

### @oat/docs-transforms

**Purpose:** Remark plugins that convert markdown syntax with no universal standard into Fumadocs-compatible AST output.

**Responsibilities:**
- `remarkTabs` — transform `=== "Tab Title"` syntax into `<Tabs>`/`<Tab>` JSX AST nodes
- Export each transform individually for testing
- Export a `defaultTransforms` array for convenience

**Interfaces:**

```typescript
import type { Plugin } from "unified";

export const remarkTabs: Plugin;

export const defaultTransforms: Plugin[];
```

**Dependencies:**
- `unified` — plugin types
- `unist-util-visit` — AST traversal
- `mdast` types — Markdown AST node types

**Design Decisions:**
- Each transform is a standalone remark plugin — composable, independently testable
- No Fumadocs dependency — pure AST-in, AST-out; could work with any MDX compiler
- `defaultTransforms` array makes it easy for `docs-config` to wire all transforms at once

### @oat/docs-theme

**Purpose:** Shared layout, page components, and Mermaid renderer with configurable branding.

**Responsibilities:**
- Export `DocsLayout` — wraps Fumadocs layout with branding config
- Export `DocsPage` — page component with TOC, content area
- Export `Mermaid` — client-side Mermaid diagram renderer
- Accept branding config (title, logo, colors) via props
- Support light and dark mode

**Interfaces:**

```typescript
interface BrandingConfig {
  title: string;
  logo?: string;
  description?: string;
  colors?: {
    primary?: string;    // Primary accent color (hex or CSS color)
    background?: string; // Background color override
  };
}

export function DocsLayout(props: {
  branding: BrandingConfig;
  children: React.ReactNode;
}): React.ReactElement;

export function DocsPage(props: {
  page: FumadocsPage;
  children: React.ReactNode;
}): React.ReactElement;

export function Mermaid(props: { chart: string }): React.ReactElement;
```

**Dependencies:**
- `fumadocs-ui` — base UI components, layout primitives
- `next-themes` — dark/light mode for Mermaid
- `mermaid` — diagram rendering (dynamic import, client-side only)
- `react`, `next` — framework

**Design Decisions:**
- Wraps `fumadocs-ui` rather than replacing it — gets all built-in components (search dialog, sidebar, breadcrumbs, code block copy button) for free
- Code block copy button is inherited from `fumadocs-ui` — no custom implementation needed (FR4)
- Mermaid is lazy-loaded and client-side only — no SSR/build-time rendering needed
- Branding is props, not CSS variables — explicit, type-safe, no magic
- Colors are optional — defaults to Fumadocs built-in theme; consumers override via `BrandingConfig.colors`

### CLI: docs migrate

**Purpose:** One-time codemod converting MkDocs-specific syntax to universal equivalents.

**Responsibilities:**
- Parse `mkdocs.yml` to extract page titles
- Scan `docs/` for `.md` files
- Convert `!!!` admonitions to `> [!TYPE]` GFM callouts
- Inject `title` frontmatter from `mkdocs.yml` entries (where missing)
- Seed empty `description: ""` frontmatter (where missing)
- Dry-run by default, `--apply` to write changes
- Report changes per file

**Interfaces:**

```typescript
// CLI command signature
// oat docs migrate [docs-dir] [--apply] [--config <mkdocs.yml>]

interface MigrateOptions {
  docsDir: string;
  apply: boolean;
  configPath?: string; // path to mkdocs.yml
}

interface MigrateResult {
  filesScanned: number;
  filesModified: number;
  changes: FileChange[];
}

interface FileChange {
  filePath: string;
  admonitionsConverted: number;
  titleInjected: boolean;
  descriptionSeeded: boolean;
}
```

**Design Decisions:**
- Dry-run default prevents accidental content modification
- Reads `mkdocs.yml` for title mapping — no guessing from filenames
- Does NOT handle tabs (`=== "Tab"`) — those are handled by build-time transform, not codemod
- Admonition conversion is regex-based line processing, not AST — simpler for a one-time tool

### CLI: docs index generate

**Purpose:** Generate an `index.md` docs surface index from the file tree for AI discoverability.

**Responsibilities:**
- Walk `docs/` directory tree recursively
- Read frontmatter from each `.md` file (title, description)
- Fallback chain: frontmatter `title` → first `# heading` → filename title-case
- **Ordering:** Lexical (alphabetical) filesystem order within each directory. `index.md` files always sort first. Deterministic and predictable without additional frontmatter.
- Produce nested markdown with links and descriptions
- Write `index.md` at docs app root (not inside `docs/`)
- Update `.oat/config.json` `documentation.index` field

**Interfaces:**

```typescript
// CLI command signature
// oat docs index generate [docs-dir] [--output <path>]

interface IndexEntry {
  title: string;
  description?: string;
  path: string;
  children?: IndexEntry[];
}

interface IndexGenerateOptions {
  docsDir: string;
  outputPath?: string; // defaults to <app-root>/index.md
}
```

**Output format:**

```markdown
# Docs Index

- [Home](docs/index.md) — Overview of the documentation
- Getting Started
  - [Quickstart](docs/quickstart.md) — Get up and running in 5 minutes
- API
  - [Overview](docs/api/index.md) — API architecture and conventions
  - [Authentication](docs/api/auth.md) — OAuth2 and API key authentication
```

**Design Decisions:**
- Markdown output (not JSON/YAML) — renders on GitHub, readable by AI, human-friendly
- Placed at app root, not inside `docs/` — prevents rendering as a docs page
- Updates `documentation.index` in config — skills find it automatically
- This is a flat content index for AI discoverability, not a navigation/layout artifact

### CLI: docs init (updated)

**Purpose:** Add Fumadocs framework choice to existing scaffold command.

**Responsibilities:**
- Add framework choice prompt (Fumadocs or MkDocs)
- Branch to appropriate template set based on choice
- For Fumadocs: scaffold thin app shell, set `documentation.tooling: "fumadocs"` in config
- For MkDocs: existing behavior unchanged, set `documentation.tooling: "mkdocs"` in config
- Set `documentation.index` in config
- Run `oat docs index generate` after Fumadocs scaffold

**Scaffolded `package.json` script contract:**

```json
{
  "scripts": {
    "dev": "oat docs index generate && next dev",
    "build": "oat docs index generate && next build",
    "docs:index": "oat docs index generate",
    "docs:lint": "markdownlint-cli2 'docs/**/*.md'",
    "docs:format": "prettier --check 'docs/**/*.md'"
  }
}
```

Index generation runs before both `dev` and `build` via shell `&&` chaining — this is package-manager-agnostic (works identically with `npm run`, `pnpm`, and `yarn`). The `oat` CLI is invoked directly as a binary (installed via `@oat/cli` dependency or globally), not through a package-manager-specific mechanism.

**MkDocs Preservation (FR8):**

The existing MkDocs template directory is renamed from `docs-app/` to `docs-app-mkdocs/` for clarity alongside the new `docs-app-fuma/` directory. Template *content* is unchanged — same files, same token interpolation, same output. The scaffold code is updated to reference the new directory name. This is a transparent organizational change that satisfies FR8: "Existing MkDocs templates are unchanged" refers to template content and behavior, not the internal directory name.

**Design Decisions:**
- Framework choice is a prompt, not a flag — discoverable for first-time users
- MkDocs template content is preserved as-is; only the directory name changes for organizational clarity
- Config fields set automatically — skills don't need manual setup
- Script contract uses `&&` chaining and direct CLI invocation — no package-manager assumptions

## Data Models

### Documentation Config Extension

**Purpose:** Extend existing `.oat/config.json` documentation section with `index` field.

**Schema:**

```typescript
interface OatDocumentationConfig {
  root?: string;                      // existing
  tooling?: string;                   // existing (e.g., "fumadocs", "mkdocs")
  config?: string;                    // existing (e.g., "next.config.js", "mkdocs.yml")
  requireForProjectCompletion?: boolean; // existing
  index?: string;                     // NEW: path to docs surface entry point
}
```

**Validation Rules:**
- `index` is optional — older repos won't have it
- When present, must be a valid relative path from repo root
- `oat docs init` and `oat docs index generate` set this automatically

### Frontmatter Convention

**Purpose:** Standard frontmatter fields for docs pages.

**Schema:**

```yaml
---
title: Page Title          # Required by convention
description: Brief summary # Recommended, AI-populated
---
```

**Validation Rules:**
- `title` should be present on every page (migration codemod ensures this)
- `description` is optional but encouraged — empty string seeded by migration

## API Design

Not applicable — this project adds CLI commands and build-time packages, not runtime APIs.

## Security Considerations

### Input Validation

- **Codemod:** Validates file paths, checks files are within `docs/` directory before modification
- **Index generator:** Reads only `.md` files, no execution of file contents
- **Scaffold:** Token interpolation uses safe string replacement, no template injection

### Data Protection

- No secrets, credentials, or PII involved
- All content is documentation markdown — public or internal, never sensitive

### Threat Mitigation

- **Path traversal in codemod:** Validate all file paths are within the target docs directory
- **Malicious markdown:** Remark plugins process AST, not raw HTML — XSS mitigated by React rendering

## Performance Considerations

### Build-Time Performance

- Remark transforms add minimal overhead — AST traversal is fast
- Mermaid rendering is client-side, not build-time — no build impact
- FlexSearch index generation scales linearly with page count

### Runtime Performance

- Static export — no server, no runtime compute
- FlexSearch loads index on first search interaction (lazy)
- Mermaid library dynamically imported on first diagram render

### Scalability

- Static sites scale infinitely behind a CDN/S3
- Build time scales with page count but docs sites are typically <500 pages

## Error Handling

### CLI Commands

- **Codemod errors:** Report per-file errors, continue processing remaining files, exit with non-zero code if any failures
- **Index generate errors:** Skip files with unparseable frontmatter, warn, continue
- **Scaffold errors:** Fail fast if target directory already exists (unless `--force`)

### Build-Time Errors

- **Transform errors:** Remark plugins should fail loudly with file path and line number — don't silently skip
- **Missing frontmatter:** Not an error — fallback chain handles this gracefully

### Logging

- **Info:** Files processed, changes made (codemod), index entries generated
- **Warn:** Missing frontmatter title, skipped files, unparseable content
- **Error:** File I/O failures, invalid config, template rendering failures

## Testing Strategy

### Requirement-to-Test Mapping

| ID | Verification | Key Scenarios |
|----|--------------|---------------|
| FR1 | integration | Scaffold + build succeeds, static output produced, starter pages render |
| FR2 | integration | Config factory produces valid Next.js config, mermaid renders, callouts render, search works |
| FR3 | unit | Tabs transform: single tab group, multiple groups, nested content, empty tabs |
| FR4 | manual | Theme renders light/dark, branding props applied, code copy button works |
| FR5 | unit + integration | Admonition codemod: simple, nested, titled, all types; frontmatter injection; dry-run vs apply |
| FR6 | unit + integration | Index generation: flat tree, nested tree, missing titles, descriptions present/absent |
| FR7 | unit | Config schema reads/writes `documentation.index` |
| FR8 | integration | MkDocs scaffold still produces working site |
| NFR1 | e2e | Author .md file with GFM callouts + mermaid + tabs, build, verify rendered output |
| NFR2 | manual | Build scaffolded app with npm, pnpm, yarn |
| NFR3 | integration | Build produces `out/` directory, search works without server |
| NFR4 | manual | Review packages for hardcoded branding |
| NFR5 | integration | Bump package version, rebuild consumer app without re-scaffolding |

### Unit Tests

- **Scope:** `@oat/docs-transforms` (AST transforms), `docs migrate` (codemod logic), `docs index generate` (tree walking, frontmatter parsing)
- **Key Test Cases:**
  - Tabs transform: `=== "Tab 1"` with content → correct `<Tabs>` AST output
  - Admonition codemod: `!!! warning "Title"\n    Content` → `> [!WARNING] Title\n> Content`
  - Admonition codemod: nested admonitions
  - Frontmatter injection: page without title + mkdocs entry → title added
  - Index generation: directory with mix of titled/untitled pages → correct fallback chain
  - Index generation: nested directories → correct indentation

### Integration Tests

- **Scope:** Full scaffold → build pipeline, codemod against fixture files
- **Key Test Cases:**
  - Scaffold Fumadocs app, install deps, run build, verify `out/` directory exists
  - Scaffold MkDocs app, verify templates unchanged
  - Run codemod on test fixture directory, verify output matches expected
  - Run index generate on test fixture directory, verify output

### End-to-End Tests

- **Scope:** Author markdown → build → verify rendered HTML
- **Test Scenarios:**
  - Write `.md` with GFM callout, mermaid fence, and tab syntax → all render correctly in built output
  - Search for content in FlexSearch → results returned

## Deployment Strategy

### Build Process

Packages are built by Turborepo as part of the OAT monorepo build:
- `pnpm build` runs TypeScript compilation for all three packages
- Turborepo handles dependency ordering (`docs-config` depends on `docs-transforms`)
- Scaffold templates are bundled into CLI assets (existing pattern)

### Publishing

- Packages published to npm as `@oat/docs-config`, `@oat/docs-transforms`, `@oat/docs-theme`
- Versioned together (same version across all three)
- CLI bundles template files at build time (existing `bundle-assets.sh` pattern)

### Consumer Deployment

Consumer repos deploy their own docs sites — OAT doesn't prescribe this:
- `npm run build` → `out/` directory
- Upload `out/` to S3, Vercel, Netlify, or any static hosting

## Migration Plan

### For Existing MkDocs Repos

1. Run `oat docs migrate --dry-run` — review proposed changes
2. Run `oat docs migrate --apply` — convert admonitions, inject frontmatter
3. Run `oat docs init` — scaffold Fumadocs app (select Fumadocs)
4. Move/point `docs/` to the new app
5. Run `npm run build` — verify everything works
6. Manually fix any edge cases (4 `md_in_html` files in Duet, tabs if preferred over transform)
7. Remove old MkDocs files (`mkdocs.yml`, `requirements.txt`, `setup-docs.sh`)

### Rollback Strategy

- Codemod changes are git-tracked — `git checkout` reverts content
- Old MkDocs scaffold still works — can revert to MkDocs at any time
- No data migrations, no database changes — rollback is trivial

## Open Questions

- **Tabs transform edge cases:** Need to prototype the `=== "Tab"` parser to understand how it handles nested content, code blocks inside tabs, adjacent tab groups

## Implementation Phases

### Phase 1: Foundation Packages

**Goal:** Create the three packages with core functionality.

**Tasks:**
- Scaffold `packages/docs-config` with config factories
- Scaffold `packages/docs-transforms` with tabs transform
- Scaffold `packages/docs-theme` with layout, page, and Mermaid components
- Wire Turborepo build dependencies
- Unit tests for transforms

**Verification:** Packages build, transforms pass unit tests.

### Phase 2: Scaffold Templates + CLI

**Goal:** `oat docs init` produces a working Fumadocs site.

**Tasks:**
- Create Fumadocs template set in CLI assets
- Add framework choice prompt to `oat docs init`
- Template token interpolation (title, description)
- Integration test: scaffold → build → verify output

**Verification:** `oat docs init` (Fumadocs) → `npm run build` succeeds with static output.

### Phase 3: Migration + Index Commands

**Goal:** Existing MkDocs repos can migrate and generate docs index.

**Tasks:**
- Implement `oat docs migrate` command (admonition codemod, frontmatter injection)
- Implement `oat docs index generate` command
- Add `documentation.index` to config schema
- Unit + integration tests for both commands

**Verification:** Migrate command correctly converts test fixtures. Index generates accurate output.

### Phase 4: Integration + Polish

**Goal:** End-to-end validation across real repos.

**Tasks:**
- Test migration against Honeycomb docs (124 files) and Duet docs (60 files)
- Verify FlexSearch works in static export
- Dark/light mode visual review
- Package manager compatibility check (npm, pnpm, yarn)
- Documentation for the packages themselves

**Verification:** Real-world migration succeeds. All NFRs validated.

## Dependencies

### External Dependencies

- **fumadocs-core** (`^x.y.z` caret range) — MDX plugins, search, page tree
- **fumadocs-ui** (`^x.y.z` caret range) — UI components, layout primitives
- **fumadocs-mdx** (`^x.y.z` caret range) — Content source, MDX compilation
- **next** (`^15.x`) — Framework
- **react** (`^19.x`) — UI

**Version policy:** Caret ranges (`^`) for all Fumadocs and framework dependencies. Allows patch and minor updates automatically; major version bumps require explicit package updates. This balances stability (no surprise breaking changes) with maintainability (automatic security/bug fixes). Consumer repos are insulated — only OAT packages need updating on major bumps.
- **flexsearch** — Client-side search engine
- **mermaid** — Diagram rendering
- **next-themes** — Dark/light mode
- **remark-github-blockquote-alert** — GFM blockquote callout syntax (`> [!NOTE]`)
- **unified/unist-util-visit** — AST traversal for custom transforms

### Internal Dependencies

- **@oat/cli** — Command infrastructure, config system, scaffold templates
- **@oat/docs-transforms** — consumed by `@oat/docs-config`
- **OAT config schema** — `documentation` section for framework/index fields

### Development Dependencies

- **vitest** — Unit and integration testing
- **TypeScript** — Type checking
- **Turborepo** — Build orchestration

## Risks and Mitigation

- **Fumadocs breaking changes:** Medium probability | Medium impact
  - **Mitigation:** Caret ranges in shared packages absorb patch/minor updates. Major bumps are explicit. Consumer repos are insulated.
  - **Contingency:** Fork or swap framework — authoring contract (plain markdown) is independent of framework.

- **Tabs transform complexity:** Low probability | Low impact
  - **Mitigation:** Prototype early in Phase 1. If too complex, fall back to manual conversion of 10 files.
  - **Contingency:** Drop tabs transform, convert files manually during migration.

- **Static export FlexSearch issues:** Low probability | Medium impact
  - **Mitigation:** Validate in Phase 1 with a minimal test app before building full scaffold.
  - **Contingency:** Use Orama (also free, also client-side) as fallback.

## References

- Specification: `spec.md`
- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- OAT config schema: `packages/cli/src/config/oat-config.ts`
- Existing docs scaffold: `packages/cli/assets/templates/docs-app/`
- Fumadocs docs: https://fumadocs.dev
