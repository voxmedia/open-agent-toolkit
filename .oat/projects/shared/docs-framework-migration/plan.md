---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: []
oat_plan_source: spec-driven
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: docs-framework-migration

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Introduce three shared packages (`docs-config`, `docs-transforms`, `docs-theme`) and CLI commands (`docs migrate`, `docs index generate`) to provide a Fumadocs-based documentation platform with plain markdown authoring, build-time transforms, and static export.

**Architecture:** Thin scaffold, heavy packages — consumer repos scaffold a minimal Next.js app via `oat docs init` that imports from shared OAT packages. All complexity lives in packages; upgrades are version bumps.

**Tech Stack:** TypeScript, Next.js 15, React 19, Fumadocs (core/ui/mdx), remark/unified, Vitest, Turborepo, Biome

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): scaffold docs-transforms package`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Foundation Packages (12 tasks)

Deliver the three shared packages with core exports. All packages build, transforms pass unit tests, config factories produce valid output, theme components export correctly.

### Task p01-t01: Scaffold docs-transforms package

**Files:**
- Create: `packages/docs-transforms/package.json`
- Create: `packages/docs-transforms/tsconfig.json`
- Create: `packages/docs-transforms/vitest.config.ts`
- Create: `packages/docs-transforms/src/index.ts`
- Modify: `pnpm-workspace.yaml` (add packages/docs-transforms)
- Modify: `turbo.json` (if needed for build pipeline)

**Step 1: Scaffold**

Create package with:
- `name: "@oat/docs-transforms"`, `type: "module"`, `main: "dist/index.js"`
- Dependencies: `unified`, `unist-util-visit`, `mdast` types
- TypeScript config extending root, output to `dist/`
- Vitest config with path aliases
- Barrel export: `src/index.ts` exporting empty `defaultTransforms` array

**Step 2: Verify**

Run: `pnpm install && pnpm --filter @oat/docs-transforms build`
Expected: Package builds to `dist/` without errors

**Step 3: Commit**

```bash
git add packages/docs-transforms/ pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "feat(p01-t01): scaffold docs-transforms package"
```

---

### Task p01-t02: Implement remarkTabs transform — test cases

**Files:**
- Create: `packages/docs-transforms/src/remark-tabs.test.ts`

**Step 1: Write test (RED)**

Test cases for the remark-tabs plugin:
- Single tab group: `=== "Tab 1"\n\n    content` → `<Tabs>` JSX AST
- Multiple tab groups in one file
- Tab with code block content (indented 4 spaces)
- Tab with multiple paragraphs
- Adjacent tab groups separated by non-tab content
- Empty tab (title only, no content)

Use `unified().use(remarkParse).use(remarkTabs).run(tree)` pattern to test AST output.

Run: `pnpm --filter @oat/docs-transforms test`
Expected: Tests fail (RED) — `remarkTabs` not yet implemented

**Step 2: Commit**

```bash
git add packages/docs-transforms/src/remark-tabs.test.ts
git commit -m "test(p01-t02): add remarkTabs transform test cases"
```

---

### Task p01-t03: Implement remarkTabs transform

**Files:**
- Create: `packages/docs-transforms/src/remark-tabs.ts`
- Modify: `packages/docs-transforms/src/index.ts`

**Step 1: Implement (GREEN)**

```typescript
// remark-tabs.ts
import type { Plugin } from 'unified';
export const remarkTabs: Plugin;
// Walk AST, find blockquote or paragraph nodes starting with === "Title"
// Group consecutive tab blocks
// Replace with mdxJsxFlowElement nodes: <Tabs> wrapping <Tab title="...">
```

Key logic:
- Parse `=== "Title"` lines as tab markers
- Content under a tab marker (indented 4 spaces) belongs to that tab
- Group consecutive tabs into a `<Tabs>` wrapper
- Output `mdxJsxFlowElement` nodes for MDX compatibility

Update `index.ts`: export `remarkTabs` and add to `defaultTransforms`

**Step 2: Verify**

Run: `pnpm --filter @oat/docs-transforms test`
Expected: All tests pass (GREEN)

**Step 3: Commit**

```bash
git add packages/docs-transforms/src/
git commit -m "feat(p01-t03): implement remarkTabs transform"
```

---

### Task p01-t04: Scaffold docs-config package

**Files:**
- Create: `packages/docs-config/package.json`
- Create: `packages/docs-config/tsconfig.json`
- Create: `packages/docs-config/vitest.config.ts`
- Create: `packages/docs-config/src/index.ts`

**Step 1: Scaffold**

Create package with:
- `name: "@oat/docs-config"`, `type: "module"`
- Dependencies: `fumadocs-core`, `fumadocs-mdx`, `next`, `@oat/docs-transforms` (`workspace:*`), `remark-github-blockquote-alert`, `flexsearch`
- Barrel export with placeholder factories

**Step 2: Verify**

Run: `pnpm install && pnpm --filter @oat/docs-config build`
Expected: Package builds without errors

**Step 3: Commit**

```bash
git add packages/docs-config/ pnpm-lock.yaml
git commit -m "feat(p01-t04): scaffold docs-config package"
```

---

### Task p01-t05: Implement createDocsConfig factory — test + implement

**Files:**
- Create: `packages/docs-config/src/next-config.ts`
- Create: `packages/docs-config/src/next-config.test.ts`
- Modify: `packages/docs-config/src/index.ts`

**Step 1: Write test (RED)**

Test that `createDocsConfig({ title: 'Test' })` returns a Next.js config object with:
- `output: 'export'`
- `images.unoptimized: true` (required for static export)
- `reactStrictMode: true`

Run: `pnpm --filter @oat/docs-config test`
Expected: Tests fail (RED)

**Step 2: Implement (GREEN)**

```typescript
// next-config.ts
interface DocsConfigOptions { title: string; description?: string; logo?: string; }
export function createDocsConfig(options: DocsConfigOptions): NextConfig {
  // Return Next.js config with static export settings
  // Wire createMDX from fumadocs-mdx
}
```

**Step 3: Verify**

Run: `pnpm --filter @oat/docs-config test`
Expected: Tests pass (GREEN)

**Step 4: Commit**

```bash
git add packages/docs-config/src/
git commit -m "feat(p01-t05): implement createDocsConfig factory"
```

---

### Task p01-t06: Implement createSourceConfig factory — test + implement

**Files:**
- Create: `packages/docs-config/src/source-config.ts`
- Create: `packages/docs-config/src/source-config.test.ts`
- Modify: `packages/docs-config/src/index.ts`

**Step 1: Write test (RED)**

Test that `createSourceConfig()` returns a Fumadocs source config with:
- `remarkPlugins` array contains `remarkTabs` from `@oat/docs-transforms`
- `remarkPlugins` array contains `remarkGithubBlockquoteAlert`
- Content directory set to `./docs`

**Step 2: Implement (GREEN)**

```typescript
// source-config.ts
export function createSourceConfig(): FumadocsSourceConfig {
  // Wire remark plugins: remarkTabs, remarkGithubBlockquoteAlert, remarkMdxMermaid
  // Configure content source pointing at docs/
}
```

**Step 3: Verify**

Run: `pnpm --filter @oat/docs-config test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/docs-config/src/
git commit -m "feat(p01-t06): implement createSourceConfig factory"
```

---

### Task p01-t07: Scaffold docs-theme package

**Files:**
- Create: `packages/docs-theme/package.json`
- Create: `packages/docs-theme/tsconfig.json`
- Create: `packages/docs-theme/src/index.ts`

**Step 1: Scaffold**

Create package with:
- `name: "@oat/docs-theme"`, `type: "module"`
- Dependencies: `fumadocs-ui`, `next`, `next-themes`, `react`, `react-dom`
- Peer dependencies: `next`, `react`, `react-dom`
- Barrel export with component stubs

**Step 2: Verify**

Run: `pnpm install && pnpm --filter @oat/docs-theme build`
Expected: Package builds without errors

**Step 3: Commit**

```bash
git add packages/docs-theme/ pnpm-lock.yaml
git commit -m "feat(p01-t07): scaffold docs-theme package"
```

---

### Task p01-t08: Implement DocsLayout component

**Files:**
- Create: `packages/docs-theme/src/docs-layout.tsx`
- Create: `packages/docs-theme/src/types.ts`
- Modify: `packages/docs-theme/src/index.ts`

**Step 1: Implement**

```typescript
// types.ts
export interface BrandingConfig {
  title: string;
  logo?: string;
  description?: string;
  colors?: { primary?: string; background?: string; };
}

// docs-layout.tsx
// Wraps fumadocs-ui DocsLayout with BrandingConfig props
// Maps branding props to fumadocs-ui layout options
// Passes children through
```

**Step 2: Verify**

Run: `pnpm --filter @oat/docs-theme build && pnpm --filter @oat/docs-theme type-check`
Expected: Builds and type-checks without errors

**Step 3: Commit**

```bash
git add packages/docs-theme/src/
git commit -m "feat(p01-t08): implement DocsLayout component"
```

---

### Task p01-t09: Implement DocsPage component

**Files:**
- Create: `packages/docs-theme/src/docs-page.tsx`
- Modify: `packages/docs-theme/src/index.ts`

**Step 1: Implement**

```typescript
// docs-page.tsx
// Wraps fumadocs-ui DocsPage with standard page props
// Renders page content, TOC, breadcrumbs
// Accepts FumadocsPage object
```

**Step 2: Verify**

Run: `pnpm --filter @oat/docs-theme build`
Expected: Builds without errors

**Step 3: Commit**

```bash
git add packages/docs-theme/src/
git commit -m "feat(p01-t09): implement DocsPage component"
```

---

### Task p01-t10: Implement Mermaid component

**Files:**
- Create: `packages/docs-theme/src/mermaid.tsx`
- Modify: `packages/docs-theme/src/index.ts`

**Step 1: Implement**

```typescript
// mermaid.tsx
// 'use client' directive — client-side only
// Dynamic import of mermaid library
// Renders <pre class="mermaid"> with chart string
// Supports dark/light mode via next-themes useTheme()
// Lazy initialization: mermaid.initialize() on first render
```

Add `mermaid` to package dependencies (dynamic import, no SSR).

**Step 2: Verify**

Run: `pnpm --filter @oat/docs-theme build`
Expected: Builds without errors

**Step 3: Commit**

```bash
git add packages/docs-theme/src/ packages/docs-theme/package.json
git commit -m "feat(p01-t10): implement Mermaid client component"
```

---

### Task p01-t11: Wire FlexSearch in docs-config

**Files:**
- Create: `packages/docs-config/src/search-config.ts`
- Create: `packages/docs-config/src/search-config.test.ts`
- Modify: `packages/docs-config/src/index.ts`

**Step 1: Write test (RED)**

Test that search config factory returns a valid FlexSearch configuration compatible with Fumadocs static search.

**Step 2: Implement (GREEN)**

```typescript
// search-config.ts
// Export search configuration for Fumadocs static search
// Wire FlexSearch as the search engine
// Compatible with static export (no server-side search)
```

**Step 3: Verify**

Run: `pnpm --filter @oat/docs-config test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add packages/docs-config/src/
git commit -m "feat(p01-t11): wire FlexSearch static search config"
```

---

### Task p01-t12: Phase 1 integration verify — all packages build

**Files:**
- No new files

**Step 1: Verify**

Run full workspace build and lint:
```bash
pnpm build
pnpm lint
pnpm type-check
pnpm --filter @oat/docs-transforms test
pnpm --filter @oat/docs-config test
```
Expected: All commands pass, Turborepo dependency ordering correct

**Step 2: Commit** (if any fixes needed)

```bash
git commit -m "fix(p01-t12): phase 1 integration fixes"
```

---

## Phase 2: Scaffold Templates + CLI (8 tasks)

Deliver `oat docs init` with Fumadocs framework choice. A scaffolded app builds and produces static output.

### Task p02-t01: Create Fumadocs template directory

**Files:**
- Create: `packages/cli/assets/templates/docs-app-fuma/next.config.js`
- Create: `packages/cli/assets/templates/docs-app-fuma/source.config.ts`
- Create: `packages/cli/assets/templates/docs-app-fuma/app/layout.tsx`
- Create: `packages/cli/assets/templates/docs-app-fuma/app/[[...slug]]/page.tsx`
- Create: `packages/cli/assets/templates/docs-app-fuma/package.json.template`
- Create: `packages/cli/assets/templates/docs-app-fuma/tsconfig.json`
- Create: `packages/cli/assets/templates/docs-app-fuma/docs/index.md`
- Create: `packages/cli/assets/templates/docs-app-fuma/docs/getting-started.md`
- Create: `packages/cli/assets/templates/docs-app-fuma/docs/contributing.md`

**Step 1: Implement**

Create thin template files that import from `@oat/docs-config`, `@oat/docs-theme`:
- `next.config.js`: imports `createDocsConfig`, calls with `{{SITE_NAME}}` and `{{SITE_DESCRIPTION}}`
- `source.config.ts`: imports `createSourceConfig`
- `app/layout.tsx`: imports `DocsLayout` from `@oat/docs-theme`, uses `{{SITE_NAME}}` and `{{SITE_DESCRIPTION}}`
- `app/[[...slug]]/page.tsx`: imports `DocsPage` from `@oat/docs-theme`
- `package.json.template`: scripts with `oat docs index generate && next dev/build`
- Starter markdown: same content as existing MkDocs templates

Token format follows existing pattern: `{{SITE_NAME}}`, `{{APP_NAME}}`, `{{SITE_DESCRIPTION}}`, etc.

**Step 2: Verify**

Run: `ls packages/cli/assets/templates/docs-app-fuma/`
Expected: All template files present

**Step 3: Commit**

```bash
git add packages/cli/assets/templates/docs-app-fuma/
git commit -m "feat(p02-t01): create Fumadocs template directory"
```

---

### Task p02-t02: Rename existing MkDocs template directory

**Files:**
- Rename: `packages/cli/assets/templates/docs-app/` → `packages/cli/assets/templates/docs-app-mkdocs/`
- Modify: `packages/cli/src/commands/docs/init/scaffold.ts` (update template path reference)

**Step 1: Implement**

```bash
git mv packages/cli/assets/templates/docs-app packages/cli/assets/templates/docs-app-mkdocs
```

Update `scaffold.ts`: change template root from `'docs-app'` to `'docs-app-mkdocs'`

**Step 2: Verify**

Run: `pnpm --filter @oat/cli build && pnpm --filter @oat/cli test`
Expected: CLI builds, existing tests pass (MkDocs scaffold still works)

**Step 3: Commit**

```bash
git add packages/cli/
git commit -m "refactor(p02-t02): rename docs-app to docs-app-mkdocs"
```

---

### Task p02-t03: Add framework choice prompt to docs init

**Files:**
- Modify: `packages/cli/src/commands/docs/init/resolve-options.ts`
- Create: `packages/cli/src/commands/docs/init/resolve-options.test.ts` (or modify existing)

**Step 1: Write test (RED)**

Test that `resolveDocsInitOptions()`:
- When `framework: 'fumadocs'` → returns options with `templateDir: 'docs-app-fuma'`
- When `framework: 'mkdocs'` → returns options with `templateDir: 'docs-app-mkdocs'`
- Interactive prompt offers both choices
- Collects site description (optional, defaults to empty string)
- Returns `siteDescription` in resolved options

**Step 2: Implement (GREEN)**

Add `framework` and `siteDescription` options to `DocsInitOptions` interface.
Add `@inquirer/prompts` select prompt for framework choice.
Add optional description input prompt.
Map framework choice to template directory name.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/init/
git commit -m "feat(p02-t03): add framework choice prompt to docs init"
```

---

### Task p02-t04: Implement Fumadocs scaffold path in scaffold.ts

**Files:**
- Modify: `packages/cli/src/commands/docs/init/scaffold.ts`
- Create or modify: `packages/cli/src/commands/docs/init/scaffold.test.ts`

**Step 1: Write test (RED)**

Test `scaffoldDocsApp()` with Fumadocs template:
- Creates all expected files from `docs-app-fuma/`
- Applies token replacements (`{{SITE_NAME}}`, `{{APP_NAME}}`, `{{SITE_DESCRIPTION}}`)
- Sets `documentation.tooling: "fumadocs"` in config
- Scaffolded `next.config.js` contains interpolated description
- Scaffolded `app/layout.tsx` contains interpolated description

**Step 2: Implement (GREEN)**

Branch scaffold logic based on `options.templateDir`:
- Fumadocs: use `docs-app-fuma/` templates, set `documentation.tooling: "fumadocs"`
- MkDocs: existing behavior, set `documentation.tooling: "mkdocs"`

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass for both framework paths

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/init/
git commit -m "feat(p02-t04): implement Fumadocs scaffold path"
```

---

### Task p02-t05: Set documentation config fields during scaffold

**Files:**
- Modify: `packages/cli/src/commands/docs/init/scaffold.ts`
- Modify: `packages/cli/src/config/oat-config.ts`

**Step 1: Write test (RED)**

Test that after scaffold:
- Fumadocs: `documentation.tooling` is `"fumadocs"`, `documentation.index` is set to index.md path
- MkDocs: `documentation.tooling` is `"mkdocs"`, `documentation.index` is `"mkdocs.yml"`, `documentation.config` is `"mkdocs.yml"`

**Step 2: Implement (GREEN)**

Update `OatDocumentationConfig` type to include `index?: string` field.
Set config fields during scaffold based on framework choice.

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: Tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/
git commit -m "feat(p02-t05): set documentation config fields during scaffold"
```

---

### Task p02-t06: Update bundle-assets script for new templates

**Files:**
- Modify: `packages/cli/scripts/bundle-assets.sh` (or equivalent build config)

**Step 1: Implement**

Ensure the CLI build bundles both `docs-app-mkdocs/` and `docs-app-fuma/` template directories into the CLI's dist/assets.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli build && ls packages/cli/dist/assets/templates/`
Expected: Both `docs-app-mkdocs` and `docs-app-fuma` directories present

**Step 3: Commit**

```bash
git add packages/cli/scripts/ packages/cli/
git commit -m "feat(p02-t06): bundle Fumadocs templates in CLI assets"
```

---

### Task p02-t07: Integration test — scaffold Fumadocs app builds

**Files:**
- Create: `packages/cli/src/commands/docs/init/integration.test.ts`

**Step 1: Write test**

Integration test that:
1. Scaffolds a Fumadocs app to a temp directory (with site name + description)
2. Runs `npm install` in the scaffolded app
3. Runs `npm run build`
4. Verifies `out/` directory exists with HTML files
5. Verifies interpolated site description appears in generated config/layout

Note: This is a slower integration test. Mark with appropriate Vitest config (e.g., timeout).

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test -- integration.test.ts`
Expected: Integration test passes

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/init/
git commit -m "test(p02-t07): integration test for Fumadocs scaffold build"
```

---

### Task p02-t08: Phase 2 verification — end-to-end scaffold flow

**Files:**
- No new files

**Step 1: Verify**

Manual verification:
1. Run `pnpm run cli -- docs init` from repo root
2. Select Fumadocs framework
3. Navigate to scaffolded app
4. Run `npm install && npm run build`
5. Verify `out/` directory with static HTML
6. Run `pnpm run cli -- docs init` again, select MkDocs
7. Verify MkDocs scaffold still works

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

**Step 2: Commit** (if fixes needed)

```bash
git commit -m "fix(p02-t08): phase 2 end-to-end verification fixes"
```

---

## Phase 3: Migration + Index Commands (10 tasks)

Deliver `oat docs migrate` and `oat docs index generate`. Existing MkDocs content converts correctly, index generation produces accurate output.

### Task p03-t01: Create docs migrate command skeleton

**Files:**
- Create: `packages/cli/src/commands/docs/migrate/index.ts`
- Modify: `packages/cli/src/commands/docs/index.ts` (register subcommand)

**Step 1: Implement**

Follow existing CLI command pattern:
- `MigrateOptions` interface: `docsDir`, `apply`, `configPath`
- `createMigrateCommand()` factory returning Commander command
- `--apply` flag (default false = dry-run)
- `--config <path>` option for mkdocs.yml location
- Register under `docs` parent command

**Step 2: Verify**

Run: `pnpm run cli -- docs migrate --help`
Expected: Help output shows migrate command with options

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/ packages/cli/src/commands/docs/index.ts
git commit -m "feat(p03-t01): create docs migrate command skeleton"
```

---

### Task p03-t02: Implement admonition-to-GFM codemod — tests

**Files:**
- Create: `packages/cli/src/commands/docs/migrate/codemod.test.ts`

**Step 1: Write test (RED)**

Test cases for admonition conversion:
- Simple: `!!! note\n    Content` → `> [!NOTE]\n> Content`
- With title: `!!! warning "Title"\n    Content` → `> [!WARNING] Title\n> Content`
- All types: note, warning, tip, important, caution
- Nested content (multiple indented lines)
- Admonition followed by regular content
- Multiple admonitions in one file
- File with no admonitions (no changes)

**Step 2: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/
git commit -m "test(p03-t02): add admonition codemod test cases"
```

---

### Task p03-t03: Implement admonition-to-GFM codemod

**Files:**
- Create: `packages/cli/src/commands/docs/migrate/codemod.ts`

**Step 1: Implement (GREEN)**

```typescript
// codemod.ts
interface CodemodResult { content: string; admonitionsConverted: number; }
export function convertAdmonitions(content: string): CodemodResult {
  // Regex-based line processing:
  // Match !!! <type> ["title"]
  // Collect indented content lines
  // Replace with > [!TYPE] title\n> content lines
}
```

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test -- codemod.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/
git commit -m "feat(p03-t03): implement admonition-to-GFM codemod"
```

---

### Task p03-t04: Implement frontmatter injection — tests + implement

**Files:**
- Create: `packages/cli/src/commands/docs/migrate/frontmatter.ts`
- Create: `packages/cli/src/commands/docs/migrate/frontmatter.test.ts`

**Step 1: Write test (RED)**

Test cases:
- File without frontmatter + mkdocs title → injects `title` and empty `description`
- File with existing title → no change
- File without mkdocs entry → falls back to first `# heading`
- File with neither → falls back to filename title-case
- Seeds `description: ""` when missing

**Step 2: Implement (GREEN)**

```typescript
// frontmatter.ts
interface FrontmatterResult { content: string; titleInjected: boolean; descriptionSeeded: boolean; }
export function injectFrontmatter(content: string, options: {
  mkdocsTitle?: string; fileName: string;
}): FrontmatterResult { /* ... */ }
```

**Step 3: Verify**

Run: `pnpm --filter @oat/cli test -- frontmatter.test.ts`
Expected: Tests pass

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/
git commit -m "feat(p03-t04): implement frontmatter injection for migrate"
```

---

### Task p03-t05: Wire migrate command handler

**Files:**
- Modify: `packages/cli/src/commands/docs/migrate/index.ts`

**Step 1: Implement**

Wire the command handler to:
1. Parse `mkdocs.yml` for nav titles (if `--config` provided)
2. Walk `docsDir` for `.md` files
3. For each file: run `convertAdmonitions()` + `injectFrontmatter()`
4. If `--apply`: write modified files to disk
5. If dry-run: report what would change
6. Report summary: files scanned, modified, changes per file

Follow dependency injection pattern with `Dependencies` interface.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/
git commit -m "feat(p03-t05): wire migrate command handler"
```

---

### Task p03-t06: Create docs index generate command skeleton

**Files:**
- Create: `packages/cli/src/commands/docs/index-generate/index.ts`
- Modify: `packages/cli/src/commands/docs/index.ts` (register subcommand)

**Step 1: Implement**

Follow CLI command pattern:
- `IndexGenerateOptions` interface: `docsDir`, `outputPath`
- `createIndexGenerateCommand()` factory
- Register as `docs index generate` subcommand
- Default output: `<app-root>/index.md`

**Step 2: Verify**

Run: `pnpm run cli -- docs index generate --help`
Expected: Help output shows command with options

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/index-generate/ packages/cli/src/commands/docs/index.ts
git commit -m "feat(p03-t06): create docs index generate command skeleton"
```

---

### Task p03-t07: Implement index generation logic — tests

**Files:**
- Create: `packages/cli/src/commands/docs/index-generate/generator.test.ts`

**Step 1: Write test (RED)**

Test cases:
- Flat directory: 3 `.md` files → markdown list with titles and links
- Nested directory: `docs/api/auth.md` → nested list
- Title fallback chain: frontmatter title → first `# heading` → filename title-case
- Description: present in frontmatter → included in output
- Ordering: lexical within directory, `index.md` always first
- Empty directory → empty output (or just header)
- Files with unparseable frontmatter → skipped with warning

**Step 2: Commit**

```bash
git add packages/cli/src/commands/docs/index-generate/
git commit -m "test(p03-t07): add index generation test cases"
```

---

### Task p03-t08: Implement index generation logic

**Files:**
- Create: `packages/cli/src/commands/docs/index-generate/generator.ts`

**Step 1: Implement (GREEN)**

```typescript
// generator.ts
interface IndexEntry { title: string; description?: string; path: string; children?: IndexEntry[]; }
export async function generateIndex(docsDir: string): Promise<IndexEntry[]> {
  // Recursively walk docsDir
  // For each .md file: parse frontmatter (title, description)
  // Fallback chain: frontmatter title → first # heading → filename title-case
  // Sort: index.md first, then lexical
  // Return nested IndexEntry tree
}
export function renderIndex(entries: IndexEntry[]): string {
  // Produce markdown output:
  // # Docs Index
  // - [Title](path) — description
  //   - [Child](path) — description
}
```

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test -- generator.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/index-generate/
git commit -m "feat(p03-t08): implement index generation logic"
```

---

### Task p03-t09: Wire index generate command + config update

**Files:**
- Modify: `packages/cli/src/commands/docs/index-generate/index.ts`

**Step 1: Implement**

Wire command handler to:
1. Call `generateIndex(docsDir)` → `renderIndex(entries)`
2. Write output to `outputPath` (default: `<app-root>/index.md`)
3. Update `.oat/config.json` `documentation.index` field
4. Report summary: entries generated, output path

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/index-generate/
git commit -m "feat(p03-t09): wire index generate command handler"
```

---

### Task p03-t10: Phase 3 verification — migrate + index commands

**Files:**
- No new files

**Step 1: Verify**

Test against fixture files:
1. Create a temp directory with MkDocs-style markdown (admonitions, missing frontmatter)
2. Run `oat docs migrate --dry-run` → verify output
3. Run `oat docs migrate --apply` → verify files modified
4. Run `oat docs index generate` → verify `index.md` output
5. Verify `.oat/config.json` `documentation.index` updated

Run: `pnpm --filter @oat/cli test`
Expected: All tests pass

**Step 2: Commit** (if fixes needed)

```bash
git commit -m "fix(p03-t10): phase 3 verification fixes"
```

---

## Phase 4: Integration + Polish (5 tasks)

End-to-end validation, real-world migration testing, and NFR verification.

### Task p04-t01: Test migration against real fixture data

**Files:**
- Create: `packages/cli/src/commands/docs/migrate/fixtures/` (test fixtures derived from real content patterns)

**Step 1: Implement**

Create test fixtures based on patterns found in Honeycomb (124 files) and Duet (60 files):
- Admonition variations (29+ patterns)
- Mermaid fences (40+ occurrences — no codemod needed, just verify passthrough)
- Tab syntax (7 occurrences)
- Files with `md_in_html` (4 occurrences — manual fix, document in migration guide)

Run codemod against fixtures and verify output.

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test`
Expected: Fixture-based tests pass

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/migrate/fixtures/
git commit -m "test(p04-t01): add real-world migration test fixtures"
```

---

### Task p04-t02: E2E test — author markdown, build, verify render

**Files:**
- Create: `packages/cli/src/e2e/docs-build.test.ts`

**Step 1: Write test**

End-to-end test:
1. Scaffold Fumadocs app to temp directory with branding config (title, description, primary color)
2. Add `.md` file with GFM callout (`> [!NOTE]`), mermaid fence, tabs syntax, and a code block
3. Run `npm install && npm run build`
4. Verify `out/` contains rendered HTML
5. Verify callout, mermaid placeholder, and tabs markup present in HTML output
6. Verify branding props reflected in rendered HTML (title, description in meta tags)
7. Verify code block HTML contains copy-button markup (inherited from fumadocs-ui)
8. Verify dark/light mode toggle markup present in rendered layout

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test -- docs-build.test.ts`
Expected: E2E test passes

**Step 3: Commit**

```bash
git add packages/cli/src/e2e/
git commit -m "test(p04-t02): e2e test for markdown authoring and build"
```

---

### Task p04-t03: Verify MkDocs scaffold still works (FR8)

**Files:**
- Create or modify: `packages/cli/src/commands/docs/init/mkdocs-compat.test.ts`

**Step 1: Write test**

Integration test:
1. Scaffold MkDocs app to temp directory
2. Verify all expected template files present
3. Verify template content unchanged (compare against known fixtures)
4. Verify `documentation.tooling: "mkdocs"` set in config
5. Verify `documentation.index: "mkdocs.yml"` set in config
6. Run `oat docs analyze` against scaffolded MkDocs site → verify command succeeds
7. Run `oat docs apply` against scaffolded MkDocs site → verify command succeeds (FR8 downstream compatibility)

**Step 2: Verify**

Run: `pnpm --filter @oat/cli test -- mkdocs-compat.test.ts`
Expected: Test passes

**Step 3: Commit**

```bash
git add packages/cli/src/commands/docs/init/
git commit -m "test(p04-t03): verify MkDocs scaffold compatibility"
```

---

### Task p04-t04: Verify FlexSearch works in static export

**Files:**
- No new files (extend e2e test or manual verification)

**Step 1: Verify**

In the scaffolded Fumadocs app:
1. Build with `npm run build`
2. Verify search index files exist in `out/`
3. Serve `out/` directory locally
4. Verify FlexSearch returns results for indexed content

**Step 2: Commit** (if fixes needed)

```bash
git commit -m "fix(p04-t04): FlexSearch static export compatibility"
```

---

### Task p04-t05: Phase 4 final verification

**Files:**
- No new files

**Step 1: Verify**

Full workspace verification:
```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
```

**Step 2: Review FR + NFR checklist**

- [ ] FR4: Theme branding → branding props (title, logo, colors) render in built site
- [ ] FR4: Dark/light mode → toggle works, Mermaid diagrams re-render on mode switch
- [ ] FR4: Code-copy button → code blocks show copy button (inherited from fumadocs-ui)
- [ ] NFR1: Plain markdown authoring → verified by e2e test
- [ ] NFR2: Package manager agnostic → manual: test `npm run build`, `pnpm build`, `yarn build` on scaffolded app
- [ ] NFR3: Static export → verified by `out/` directory existence
- [ ] NFR4: Open source ready → review packages for hardcoded org branding
- [ ] NFR5: Upgrade path → bump package version, rebuild consumer without re-scaffold

**Step 3: Commit** (if fixes needed)

```bash
git commit -m "fix(p04-t05): phase 4 final verification fixes"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| final | code | pending | - | - |
| spec | artifact | pending | - | - |
| design | artifact | received | 2026-03-08 | reviews/artifact-design-review-2026-03-08-v2.md |
| plan | artifact | passed | 2026-03-08 | reviews/artifact-plan-review-2026-03-08.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Plan Summary:**
- Phase 1: 12 tasks — Foundation packages (docs-transforms, docs-config, docs-theme)
- Phase 2: 8 tasks — Scaffold templates + CLI framework choice
- Phase 3: 10 tasks — Migration codemod + index generation commands
- Phase 4: 5 tasks — Integration testing, real-world validation, NFR verification

**Total: 35 tasks**

**Status:** Plan complete, awaiting implementation execution.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
