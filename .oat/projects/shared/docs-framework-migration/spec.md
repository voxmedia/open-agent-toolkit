---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-03-08
oat_generated: false
---

# Specification: docs-framework-migration

## Phase Guardrails (Specification)

Specification is for requirements and acceptance criteria, not design/implementation details.

- Avoid concrete deliverables (specific scripts, file paths, function names).
- Keep the "High-Level Design" section to architecture shape and component boundaries only.
- If a design detail comes up, record it under **Open Questions** for `oat-project-design`.

## Problem Statement

OAT is preparing to roll out documentation sites across all repos in the organization. The current MkDocs Material scaffold produces functional but visually dated sites. As a platform-level decision affecting every repo, the docs framework needs to produce polished, modern-looking sites that drive adoption — while keeping the authoring experience dead simple (plain markdown, no JSX/MDX knowledge required).

Additionally, the docs surface needs to be AI-friendly. Skills and agents that populate and analyze documentation need a reliable, single-file entry point to understand what docs exist, what they cover, and where gaps are. The current MkDocs approach stores this in `mkdocs.yml`, which is framework-specific. A portable, generated navigation artifact would serve both human and AI consumers.

The solution must be open source as part of OAT, with no org-specific branding hardcoded, and must continue supporting MkDocs as an alternative for consumers who prefer it.

## Goals

### Primary Goals

- Provide a Fumadocs-based docs scaffold that produces modern, polished documentation sites
- Maintain plain markdown authoring — authors never write JSX or MDX
- Create shared packages that encapsulate all framework complexity so consumer repos stay thin
- Provide a migration path from existing MkDocs sites (admonition codemod, frontmatter injection)
- Generate a navigation artifact (`index.md`) with page titles and descriptions for AI discoverability
- Support static export for deployment to S3 or any static hosting
- Include free, client-side search out of the box

### Secondary Goals

- Establish frontmatter conventions (`title`, `description`) that improve search, meta tags, and AI workflows
- Maintain extensibility for future framework support (Docusaurus, etc.)

## Non-Goals

- Docusaurus support (future extensibility point, not built in this phase)
- Updating `oat-docs-analyze` / `oat-docs-apply` skills for Fumadocs awareness (follow-up work)
- Custom docs plugins for new capabilities (auto-linking, code injection, API doc generation)
- Doc versioning
- Hosted/paid search integrations (Algolia, Orama, etc.)
- SSR or ISR deployment modes

## Requirements

### Functional Requirements

**FR1: Fumadocs Scaffold**
- **Description:** `oat docs init` must scaffold a working Fumadocs (Next.js) documentation site when the user selects the Fumadocs framework option.
- **Acceptance Criteria:**
  - Interactive prompt offers framework choice (Fumadocs or MkDocs)
  - Scaffolded app builds successfully with `npm run build` (or equivalent)
  - Scaffolded app produces a static `out/` directory
  - Scaffolded app includes starter pages (home, getting-started, contributing)
  - Site title and description are interpolated from user input at scaffold time
- **Priority:** P0

**FR2: Shared Docs Config Package**
- **Description:** A shared package must encapsulate Fumadocs MDX configuration, remark/rehype plugin wiring, and Next.js static export settings so consumer repos don't configure these directly.
- **Acceptance Criteria:**
  - Package exports a config factory that consumer repos call in their Next.js config
  - Package exports a content source config factory for Fumadocs MDX
  - Mermaid fenced code blocks render as diagrams without content changes
  - GFM callouts (`> [!NOTE]`) render as styled callouts without content changes
  - FlexSearch is wired and functional in static export
- **Priority:** P0

**FR3: Shared Docs Transforms Package**
- **Description:** A shared package must provide remark plugins that convert markdown syntax (with no universal standard) into Fumadocs-compatible output at build time.
- **Acceptance Criteria:**
  - Tabs transform converts `=== "Tab Title"` syntax into appropriate component output
  - Transforms are independently testable with unit tests against AST input/output
  - New transforms can be added without modifying consumer repos
- **Priority:** P0

**FR4: Shared Docs Theme Package**
- **Description:** A shared package must provide layout and page components with configurable branding so all docs sites share a consistent, polished look.
- **Acceptance Criteria:**
  - Package exports layout and page components that consumer repos import
  - Branding (title, logo, description, colors) is configurable via props — not hardcoded
  - Mermaid React component is included and wired
  - Theme renders correctly in both light and dark mode
  - Code blocks include copy button
- **Priority:** P0

**FR5: MkDocs Migration Codemod**
- **Description:** A CLI command must convert MkDocs-specific markdown syntax to universal equivalents in existing docs content.
- **Acceptance Criteria:**
  - Converts `!!!` admonition syntax to `> [!TYPE]` GFM callouts
  - Injects `title` frontmatter from `mkdocs.yml` nav entries where pages lack it
  - Seeds empty `description: ""` frontmatter on pages missing it
  - Runs in dry-run mode by default, showing what would change
  - Applies changes only with explicit `--apply` flag
- **Priority:** P0

**FR6: Docs Index Generation**
- **Description:** A CLI command must generate an `index.md` docs surface index from the file tree, including page titles and descriptions from frontmatter for AI discoverability.
- **Acceptance Criteria:**
  - Reads `docs/` directory tree recursively
  - Pulls `title` from frontmatter (falls back to first `# heading`, then filename title-casing)
  - Includes `description` from frontmatter when present
  - Outputs `index.md` at the docs app root (not inside `docs/`)
  - Generated file includes nested markdown links with descriptions
  - Command is also available as an npm script in scaffolded apps
  - Integrates into `dev` and `build` scripts (runs before Next.js)
- **Priority:** P0

**FR7: Documentation Config Schema Extension**
- **Description:** The `.oat/config.json` `documentation` section must include an `index` field pointing to the docs surface entry point.
- **Acceptance Criteria:**
  - `documentation.index` field added to the config schema
  - `oat docs init` sets this field when scaffolding (e.g., `index.md` for Fumadocs, `mkdocs.yml` for MkDocs)
  - `oat docs index generate` updates this field
  - Skills can read `documentation.index` to find the docs surface entry point
- **Priority:** P1

**FR8: MkDocs Scaffold Preservation**
- **Description:** The existing MkDocs scaffold must continue to work alongside the new Fumadocs option.
- **Acceptance Criteria:**
  - `oat docs init` with MkDocs selection produces the same output as before
  - Existing MkDocs templates are unchanged
  - MkDocs-specific CLI commands (`oat docs analyze`, `oat docs apply`) continue working
- **Priority:** P1

### Non-Functional Requirements

**NFR1: Plain Markdown Authoring**
- **Description:** Authors must be able to write standard markdown files (`.md`) without any JSX, MDX imports, or framework-specific syntax.
- **Acceptance Criteria:**
  - All content authored as `.md` files with standard markdown + GFM
  - No JSX or `import` statements required in author-facing files
  - Admonitions use GFM callout syntax (`> [!NOTE]`)
  - Code blocks use standard fenced syntax (including ` ```mermaid `)
- **Priority:** P0

**NFR2: Package Manager Agnostic**
- **Description:** Scaffolded docs apps must work with npm, pnpm, and yarn without modification.
- **Acceptance Criteria:**
  - Build and dev scripts use standard commands (no pnpm-specific features)
  - `oat docs index generate` invocation doesn't assume a package manager
  - npm script wrappers work identically across package managers
- **Priority:** P0

**NFR3: Static Export Compatibility**
- **Description:** All features must work in Next.js static export mode (`output: 'export'`).
- **Acceptance Criteria:**
  - Search (FlexSearch) works without a server
  - All pages render as static HTML
  - Images work with `unoptimized: true`
  - No runtime Node.js required
- **Priority:** P0

**NFR4: Open Source Ready**
- **Description:** All packages must be suitable for open source distribution with no org-specific content.
- **Acceptance Criteria:**
  - No hardcoded logos, brand colors, or org-specific text
  - All branding is configurable
  - Packages are publishable to npm
- **Priority:** P1

**NFR5: Upgrade Path**
- **Description:** Consumer repos must be able to upgrade docs packages without re-scaffolding.
- **Acceptance Criteria:**
  - Bumping package versions in `package.json` picks up config/theme/transform changes
  - Scaffolded files rarely change (thin scaffold pattern)
  - No breaking changes to the authoring contract (markdown syntax) during minor version bumps
- **Priority:** P1

## Constraints

- Authors must write plain `.md` files — no JSX authoring
- Must support static export (no Node.js server at runtime)
- MkDocs must remain a supported scaffold option
- No org-specific branding hardcoded in packages
- Must work with npm, pnpm, and yarn
- Packages live in the OAT monorepo, managed by Turborepo
- Consumer repos have Node.js available (OAT CLI requirement)

## Dependencies

- **Fumadocs ecosystem:** `fumadocs-core`, `fumadocs-ui`, `fumadocs-mdx` packages
- **Next.js:** Runtime framework for Fumadocs
- **Remark/Rehype ecosystem:** `remark-directive`, `remarkMdxMermaid`, `remarkDirectiveAdmonition` plugins
- **FlexSearch:** Client-side search engine
- **OAT CLI:** Existing scaffold infrastructure, config schema, command system
- **OAT config schema:** Existing `documentation` config section (recently shipped)

## High-Level Design (Proposed)

Three new packages in the OAT monorepo provide the docs platform. A shared config package wires Fumadocs with all necessary remark/rehype plugins and static export settings. A shared transforms package provides remark plugins for markdown syntax that has no universal standard (tabs). A shared theme package provides layout components and configurable branding.

The scaffolded docs app per consumer repo is intentionally thin — a handful of files that import from the shared packages. All complexity lives in the packages, not in the scaffold. Upgrading is a version bump, not a re-scaffold.

The CLI gains two new commands: a migration codemod for converting MkDocs syntax to universal equivalents, and a nav generator that produces a markdown navigation artifact from the file tree. The existing `oat docs init` command adds a framework choice prompt and Fumadocs template set alongside the existing MkDocs templates.

**Key Components:**
- Shared docs config package — framework wiring, plugin configuration
- Shared docs transforms package — remark AST transforms for non-standard syntax
- Shared docs theme package — layout, page components, branding configuration
- Fumadocs scaffold templates — thin app shell for consumer repos
- Migration codemod CLI command — one-time MkDocs → GFM syntax conversion
- Docs index generator CLI command — file tree → `index.md` with frontmatter metadata

**Alternatives Considered:**
- Fat scaffold (all config inline per repo) — rejected due to upgrade burden and org-wide drift
- Ejectable scaffold — rejected as unnecessary complexity; Next.js overrides provide escape hatch

*Design-related open questions are tracked in the [Open Questions](#open-questions) section below.*

## Success Metrics

- Scaffolded Fumadocs site builds and serves successfully on first run
- Migration codemod correctly converts admonitions and injects frontmatter across test repos (Honeycomb: 124 files, Duet: 60 files)
- `index.md` generation produces accurate titles and descriptions from frontmatter
- FlexSearch returns relevant results in static export mode
- Package version bump in consumer repo picks up changes without re-scaffolding

## Requirement Index

| ID | Description | Priority | Verification | Planned Tasks |
|----|-------------|----------|--------------|---------------|
| FR1 | Fumadocs scaffold via `oat docs init` | P0 | integration: scaffold + build | p02-t01, p02-t03, p02-t04, p02-t07 |
| FR2 | Shared docs config package | P0 | integration: build + render | p01-t04, p01-t05, p01-t06, p01-t11 |
| FR3 | Shared docs transforms package | P0 | unit: AST transform output | p01-t01, p01-t02, p01-t03 |
| FR4 | Shared docs theme package | P0 | manual: visual review + dark/light mode | p01-t07, p01-t08, p01-t09, p01-t10 |
| FR5 | MkDocs migration codemod | P0 | unit + integration: codemod output against test fixtures | p03-t01, p03-t02, p03-t03, p03-t04, p03-t05, p04-t01 |
| FR6 | Docs index generation | P0 | unit + integration: generated index.md content | p03-t06, p03-t07, p03-t08, p03-t09 |
| FR7 | Documentation config schema `index` field | P1 | unit: config read/write | p02-t05, p03-t09 |
| FR8 | MkDocs scaffold preservation | P1 | integration: existing scaffold still works | p02-t02, p04-t03 |
| NFR1 | Plain markdown authoring | P0 | e2e: author .md, build, verify render | p04-t02 |
| NFR2 | Package manager agnostic | P0 | manual: test with npm, pnpm, yarn | p04-t05 |
| NFR3 | Static export compatibility | P0 | integration: build + verify out/ | p02-t07, p04-t04 |
| NFR4 | Open source ready | P1 | manual: review for hardcoded branding | p04-t05 |
| NFR5 | Upgrade path | P1 | integration: bump version, rebuild | p04-t05 |

## Open Questions

- **Tabs transform complexity:** How complex is the `=== "Tab"` → `<Tabs>` remark transform in practice? Prototype needed during design.
- **Fumadocs static export limitations:** Are there FlexSearch or Fumadocs UI features that don't work with `output: 'export'`? Validate during design.
- **Theme customization surface:** What exactly does the theme package expose for branding — colors/logo only, or full layout overrides?
- **Migrate command framework detection:** Should `oat docs migrate` auto-detect the source framework, or require explicit `--from mkdocs` flag?
- **Index generation ordering:** How should pages be ordered in `index.md` — alphabetical, by frontmatter weight/order field, or directory listing order?

## Assumptions

- Fumadocs' `remarkMdxMermaid` plugin handles ` ```mermaid ` fenced blocks without content changes
- Fumadocs supports GFM-style `> [!NOTE]` callouts via `remarkDirectiveAdmonition`
- FlexSearch works fully in Next.js static export mode
- Consumer repos have Node.js 18+ available
- The OAT config schema `documentation` section is stable and shipped

## Risks

- **Fumadocs single maintainer:** One primary maintainer. If project is abandoned, OAT owns the dependency.
  - **Likelihood:** Low
  - **Impact:** Medium
  - **Mitigation:** OAT wraps Fumadocs completely — consumer repos never import it directly. Framework could be swapped without changing the authoring contract.

- **MkDocs codemod edge cases:** Migration may miss nested admonitions, admonitions in lists, or other syntax edge cases.
  - **Likelihood:** Medium
  - **Impact:** Low
  - **Mitigation:** Dry-run mode shows all changes before applying. File counts are small enough for manual review.

- **Fumadocs breaking changes:** Major version updates to Fumadocs could require significant package updates.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation:** Pin Fumadocs versions in shared packages. Consumer repos are insulated — only the OAT packages need updating.

## References

- Discovery: `discovery.md`
- Knowledge Base: `.oat/repo/knowledge/project-index.md`
- OAT config schema: `packages/cli/src/config/oat-config.ts`
- Existing docs scaffold: `packages/cli/assets/templates/docs-app/`
- Fumadocs docs: https://fumadocs.dev
