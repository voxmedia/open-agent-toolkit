# MkDocs to Fumadocs Migration Guide

End-to-end guide for migrating an existing MkDocs Material site to Fumadocs using OAT CLI tooling. Based on the real migration of `apps/oat-docs` (37 files, 16 tasks, 17 gotchas discovered).

## Prerequisites

- OAT CLI installed (`@oat/cli` in workspace or global)
- PR #54 merged (ships `@oat/docs-config`, `@oat/docs-transforms`, `@oat/docs-theme`, scaffold templates, CLI commands)
- Node.js 22+, pnpm workspace

## Step 1: Run the migration codemod

The codemod converts MkDocs-specific markdown to GFM and injects frontmatter.

### Dry-run first

```bash
pnpm run cli -- docs migrate --docs-dir <docs-dir> --config <mkdocs.yml>
```

Review the output. It reports:

- Admonition conversions (`!!!` / `???` → `> [!TYPE]`)
- Frontmatter injections (`title` from mkdocs.yml nav, `description: ""`)

### Apply

```bash
pnpm run cli -- docs migrate --docs-dir <docs-dir> --config <mkdocs.yml> --apply
```

### Gotchas

**YAML titles with backticks:** Titles containing backticks (e.g., `` `cli` Commands ``) must be quoted in YAML frontmatter. The codemod handles this, but verify with:

```bash
grep -r '^title:' <docs-dir> | grep '`'
```

**Admonition type mapping:** MkDocs has 19+ admonition types; GFM has 5. The mapping is deterministic but sometimes surprising:

- `danger`, `failure`, `bug` → CAUTION
- `success`, `example` → TIP
- `question`, `help`, `faq` → NOTE
- `abstract`, `summary`, `tldr` → NOTE

**Title resolution priority:** mkdocs.yml nav entry → first `# H1` heading → filename. Files not in nav get auto-generated titles — spot-check these.

### Commit

```bash
git add <docs-dir>
git commit -m "refactor(<app>): migrate markdown to GFM format"
```

---

## Step 2: Scaffold the Fumadocs app

`oat docs init` requires an empty target directory. Strategy: backup docs, nuke app, scaffold, restore.

### Backup docs

```bash
cp -r <app-dir>/docs /tmp/docs-backup
```

### Remove MkDocs app

```bash
git rm -r <app-dir>/
rm -rf <app-dir>/   # removes node_modules, .venv, etc.
```

### Scaffold

```bash
pnpm run cli -- docs init \
  --framework fumadocs \
  --app-name <app-name> \
  --target-dir <app-dir> \
  --description "<description>" \
  --lint markdownlint \
  --format prettier \
  --yes
```

### Restore docs

```bash
rm -rf <app-dir>/docs          # remove scaffold starter page
cp -r /tmp/docs-backup <app-dir>/docs
```

### Fix package.json scripts

The scaffold uses `npx oat` which doesn't work in a pnpm workspace — the `@oat/cli` bin link fails at install time because `dist/index.js` doesn't exist yet. Use `pnpm -w run cli --` instead, which runs the workspace root's `cli` script via `tsx`:

```json
{
  "predev": "fumadocs-mdx && pnpm -w run cli -- docs generate-index --docs-dir <app-dir>/docs --output <app-dir>/index.md",
  "prebuild": "fumadocs-mdx && pnpm -w run cli -- docs generate-index --docs-dir <app-dir>/docs --output <app-dir>/index.md"
}
```

> [!WARNING]
> **Two CI gotchas:**
>
> 1. Do **not** use `pnpm exec oat` — the bin link is created during `pnpm install` before `@oat/cli` is built, so it silently fails and the command is never available.
> 2. Do **not** put `fumadocs-mdx` in `postinstall` — it generates code that imports `@oat/docs-config`, which hasn't been built yet during install. Keep it in `predev`/`prebuild` where turbo ensures dependencies build first.
>
> Paths in `pnpm -w run cli` are relative to the **workspace root**, not the app directory.

### Commit

```bash
git add <app-dir>/
git commit -m "feat(<app>): replace MkDocs with Fumadocs scaffold"
```

---

## Step 3: Update OAT config

```bash
pnpm run cli -- config set documentation.tooling fumadocs
pnpm run cli -- config set documentation.config <app-dir>/next.config.js
```

Verify `documentation.root` still points at the docs directory.

---

## Step 4: Generate docs index

```bash
pnpm run cli -- docs generate-index --docs-dir <app-dir>/docs --output <app-dir>/index.md
```

---

## Step 5: Install and build

```bash
pnpm install
pnpm build
```

**You will likely hit multiple build errors.** Here's every known issue and fix:

### Fix: Invalid source.config.ts exports

**Symptom:** Build error about unexpected export from `source.config.ts`

**Cause:** fumadocs-mdx only supports `docs` collection exports. If there's a `search` export, remove it.

**Fix:** `source.config.ts` should only have:

```typescript
import { createSourceConfig } from '@oat/docs-config';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

const sourceConfig = createSourceConfig();

export const docs = defineDocs({
  dir: sourceConfig.contentDir,
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: sourceConfig.remarkPlugins,
  },
});
```

### Fix: Webpack scheme error for fumadocs-mdx imports

**Symptom:** `Module not found: Can't resolve 'fumadocs-mdx:collections/docs'`

**Cause:** Old import pattern uses custom webpack scheme that doesn't resolve.

**Fix in `lib/source.ts`:**

```typescript
import { loader } from 'fumadocs-core/source';
import { docs } from '@/.source/server';

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
});
```

The `@/.source/server` path is generated by `fumadocs-mdx`. It runs automatically via `predev`/`prebuild` scripts.

### Fix: baseUrl routing mismatch

**Symptom:** Sidebar links all return 404.

**Cause:** Default scaffold has `baseUrl: '/docs'` but the app catch-all route is at root.

**Fix:** In `lib/source.ts`, set `baseUrl: '/'`.

### Fix: Static export crash on root path

**Symptom:** `TypeError: Cannot read properties of undefined (reading 'length')` during static build.

**Cause:** `generateStaticParams()` doesn't include root path for `[[...slug]]` catch-all.

**Fix in `app/[[...slug]]/page.tsx`:**

```typescript
export function generateStaticParams() {
  return [
    { slug: undefined }, // handles root path /
    ...source.generateParams().filter((p) => p.slug.length > 0),
  ];
}
```

### Fix: Search crash in static export

**Symptom:** `Uncaught TypeError: items.map is not a function` when opening search.

**Cause:** `RootProvider` defaults to fetch-based search, which needs a dynamic API route. Static export can't serve dynamic routes.

**Fix in `app/layout.tsx`:**

```tsx
<RootProvider search={{ options: { type: 'static' as const } }}>
```

### Fix: Missing code block syntax highlighting

**Symptom:** Code blocks render as plain text — no colors, no copy button, no titles.

**Cause:** `fumadocs-ui/mdx` default components not included in MDX rendering.

**Fix in `app/[[...slug]]/page.tsx`:**

```typescript
import { DocsPage, Mermaid, Tab, Tabs } from '@oat/docs-theme';
import defaultComponents from 'fumadocs-ui/mdx';

const mdxComponents = { ...defaultComponents, Mermaid, Tab, Tabs };

// In render:
<MDX components={mdxComponents} />
```

### Fix: Tailwind class scanning for Fumadocs components

**Symptom:** Fumadocs UI components render but styles are missing (no colors, wrong spacing).

**Cause:** Tailwind CSS v4 doesn't scan `node_modules` by default.

**Fix in `app/globals.css`:**

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/black.css';
@import 'fumadocs-ui/css/preset.css';

@source '../node_modules/fumadocs-ui/dist/**/*.js';
```

---

## Step 6: Add callout styling

The `remark-github-blockquote-alert` plugin outputs HTML with `.markdown-alert` classes. These need CSS.

**Do NOT** try `@import 'remark-github-blockquote-alert/alert.css'` — it causes PostCSS errors with Tailwind v4.

Add to `app/globals.css` (must be inside `@layer base` to prevent Tailwind v4 purging):

```css
@layer base {
  .markdown-alert {
    border-radius: 0.75rem;
    border: 1px solid var(--color-fd-border);
    border-left: 3px solid var(--callout-color, var(--color-fd-border));
    background: var(--color-fd-card);
    color: var(--color-fd-card-foreground);
    padding: 0.75rem 1rem;
    margin: 1rem 0;
    font-size: 0.875rem;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
  }

  .markdown-alert > :first-child {
    margin-top: 0;
  }
  .markdown-alert > :last-child {
    margin-bottom: 0;
  }

  .markdown-alert .markdown-alert-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    margin-bottom: 0.25rem;
    color: var(--callout-color, var(--color-fd-foreground));
  }

  .markdown-alert .markdown-alert-title svg {
    fill: currentColor;
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
  }

  .markdown-alert p:not(.markdown-alert-title) {
    color: var(--color-fd-muted-foreground);
    margin: 0.25rem 0 0;
  }

  .markdown-alert-note {
    --callout-color: var(--color-fd-info, #3b82f6);
  }
  .markdown-alert-tip {
    --callout-color: #22c55e;
  }
  .markdown-alert-important {
    --callout-color: #a855f7;
  }
  .markdown-alert-warning {
    --callout-color: #eab308;
  }
  .markdown-alert-caution {
    --callout-color: #ef4444;
  }
}
```

---

## Step 7: Verify the search bar shows

If the search bar is missing from the sidebar but ⌘K still opens the search dialog, you have a **duplicate React context** problem.

### Diagnosis

In pnpm monorepos, `fumadocs-ui` can resolve to different store locations for different packages. The `SearchContext` created by `RootProvider` (app's copy) is invisible to `LargeSearchToggle` inside `DocsLayout` (theme package's copy).

### Verify

```bash
readlink -f <app-dir>/node_modules/fumadocs-ui
readlink -f packages/docs-theme/node_modules/fumadocs-ui
```

If these paths differ, you have duplicate instances.

### Fix

Ensure `fumadocs-ui`, `fumadocs-core`, and `fumadocs-mdx` are **peerDependencies** (not regular dependencies) in `@oat/docs-theme` and `@oat/docs-config`. After changing, run `pnpm install` and verify both paths resolve to the same location.

---

## Step 8: Verify .md links work

The `remarkLinks` plugin (included in `createSourceConfig()`) automatically rewrites `.md` links at build time:

- `quickstart.md` → `./quickstart`
- `cli/index.md` → `./cli`
- ``[`cli/index.md`](cli/index.md)`` → ``[`cli`](./cli)`` (cleans display text too)

Raw markdown keeps `.md` paths for AI navigation. No manual link editing needed.

**Test:** Click links in `## Contents` sections — they should navigate correctly without `.md` in the URL.

---

## Step 9: Clean up MkDocs artifacts

Remove any leftover MkDocs files not already cleaned in Step 2:

```bash
rm -f <app-dir>/mkdocs.yml
rm -f <app-dir>/setup-docs.sh
rm -f <app-dir>/requirements.txt
rm -rf <app-dir>/.venv
```

---

## Step 10: Full verification checklist

```bash
pnpm build        # all pages generated
pnpm test         # no regressions
pnpm type-check   # clean
pnpm lint         # clean
```

Dev server spot-checks:

- [ ] Homepage renders with sidebar navigation and search bar
- [ ] Search works (⌘K shortcut and sidebar button)
- [ ] Dark/light mode toggle works
- [ ] Callouts render with colored left border (NOTE=blue, WARNING=yellow, etc.)
- [ ] Code blocks have syntax highlighting, copy button, and title support
- [ ] Tabs render with styled active state (if tab syntax exists)
- [ ] Mermaid diagrams render (if any exist)
- [ ] Links in `## Contents` sections navigate correctly
- [ ] Nested pages render with breadcrumbs and expanded sidebar

---

## Reference: Complete file structure after migration

```
<app-dir>/
├── app/
│   ├── [[...slug]]/
│   │   └── page.tsx          # Dynamic docs route + generateStaticParams
│   ├── api/
│   │   └── search/
│   │       └── route.ts      # Static search API
│   ├── globals.css            # Tailwind v4 + callout styles
│   └── layout.tsx             # RootProvider + DocsLayout
├── docs/                      # Your markdown files (unchanged)
│   ├── index.md
│   ├── contributing.md
│   └── ...
├── lib/
│   └── source.ts              # Fumadocs source loader (baseUrl: '/')
├── index.md                   # Generated docs surface index
├── next.config.js             # Via createDocsConfig()
├── source.config.ts           # Via createSourceConfig() + defineDocs
├── package.json
└── tsconfig.json
```

## Reference: Key dependency versions

```json
{
  "next": "^16.1.6",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "fumadocs-core": "^16.6.13",
  "fumadocs-ui": "^16.6.13",
  "fumadocs-mdx": "^14.2.9",
  "tailwindcss": "^4.2.1",
  "@tailwindcss/postcss": "^4.2.1",
  "@oat/docs-config": "workspace:*",
  "@oat/docs-theme": "workspace:*",
  "@oat/docs-transforms": "workspace:*"
}
```

## Reference: Remark plugin pipeline

Applied automatically via `createSourceConfig().remarkPlugins`:

1. **remarkLinks** — Rewrites `.md` links to extensionless paths for Fumadocs routing
2. **remarkTabs** — Converts `=== "Title"` tab syntax to `<Tabs>/<Tab>` MDX JSX
3. **remarkAlert** — Converts `> [!TYPE]` callouts to styled HTML with icons
4. **remarkMermaid** — Converts ` ```mermaid ` blocks to `<Mermaid chart="...">` JSX
