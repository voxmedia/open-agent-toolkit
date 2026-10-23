# @open-agent-toolkit/docs-config

Configuration helpers for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @open-agent-toolkit/docs-config @open-agent-toolkit/docs-theme @open-agent-toolkit/docs-transforms
```

Install the required Fumadocs, Next.js, and React peer dependencies in your app as well.

## Usage

`next.config.js`

```js
import { createDocsConfig } from '@open-agent-toolkit/docs-config';

export default createDocsConfig({
  basePath: '/my-docs',
});
```

`createDocsConfig` preserves static export settings while accepting optional `basePath` and `turbopack.root`. For nested-standalone apps with their own lockfile, pass `turbopack: { root: dirname(fileURLToPath(import.meta.url)) }` with `dirname` from `node:path` and `fileURLToPath` from `node:url`. Leave it unset for monorepos and single-package apps so Next.js can discover the dependency root. Set the site title and description through the Next.js `metadata` export in `app/layout.tsx`, and the navigation title through `DocsLayout` branding.

`source.config.ts`

```ts
import { createSourceConfig } from '@open-agent-toolkit/docs-config';
import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

// Paths resolve from the app working directory, including bundled source configs.
const sourceConfig = createSourceConfig({
  oatConfigFile: '../../.oat/config.json',
  appRoot: '.',
});

export const docs = defineDocs({
  dir: sourceConfig.contentDir,
  docs: sourceConfig.docs,
  meta: sourceConfig.meta,
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: sourceConfig.remarkPlugins,
  },
});
```

The `docs` and `meta` options apply shared `documentation.nonReaderPaths` only when the explicit repo config's documentation root matches this app. Patterns follow OAT's bounded content-root-relative grammar: `*` within a segment, whole-segment `**` across directories, trailing `/` for directories, all other characters literal. Excluded directories omit descendants and metadata. `documentation.excludes` remains manifest-only. No ancestor config search occurs; scaffolded apps receive their resolved relative config path.

Link rewriting uses the explicit app root's `docs` directory (or `./docs` from the working directory when omitted) and discovers readers with the same collection patterns and tinyglobby engine. Both source and target index collisions follow filtered reader membership, including `.mdx` readers. The inventory refreshes lazily for each transformed document, so adding or removing a reader does not require rebuilding the source configuration. OAT adds no error fallback; traversal follows the emitter's tinyglobby semantics, including skipped unreadable directories.

The metadata schema preserves Fumadocs fields and accepts boolean roots and nonempty trimmed string inputs. String inputs normalize to `true` for the pinned generated collection types; authored metadata files remain unchanged. Booleans, including `false`, retain their values. Use both source options so collection validation and rendering agree with navigation. The scaffold pins MkDocs 1.4.2 separately; that version has no configurable rendering exclusion, so its non-readers leave nav/manifest but still render as routes.

## Agent Markdown endpoints

Import `createLlmsRoutes` from `@open-agent-toolkit/docs-config/llms` in runtime route/source files; this narrow entry avoids bundling Next/MDX build configuration. `createLlmsRoutes(source, { basePath })` accepts the real Fumadocs loader with MDX `getText('raw')` methods. Keep the loader's `baseUrl: '/'` and pass the same optional basePath as Next. It exposes `index()`, `full()`, `page(slug)` and `generateStaticParams()` for the scaffold's static route handlers: `/llms.txt`, `/llms-full.txt`, and `/llms/[...slug]` with the terminal `content.md` segment. The root page is `/llms/content.md`; a nested guide is `/llms/guide/content.md`. No rewrites or server are needed.

All endpoints enumerate the same loaded `.md` pages, including readers omitted from a hand-authored sidebar; collection-level `nonReaderPaths` filtering still applies. MDX stays outside these endpoints and the OAT manifest. Bodies retain authored frontmatter and Markdown; relative links describe source paths rather than the endpoint directory. The agent header and each entry identify the source, canonical rendered URL (with trailing slash) and Markdown URL. Base paths are added once. Missing pages return 404 in the handler and have no exported file. The helper uses pinned core 16.10.2 loader and MDX 14.3.2 raw-source APIs; newer upstream `page`/`full` llms helpers are not assumed.

## Exports

- `createLlmsRoutes`
- `createDocsConfig`
- `createSearchConfig`
- `createSourceConfig`

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
