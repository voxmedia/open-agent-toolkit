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

The metadata schema preserves Fumadocs fields and narrowly allows `root: true` or a nonempty trimmed string, matching the pinned loader's named-root behavior. Use both source options so collection validation and rendering agree with navigation. The scaffold pins MkDocs 1.4.2 separately; that version has no configurable rendering exclusion, so its non-readers leave nav/manifest but still render as routes.

## Exports

- `createDocsConfig`
- `createSearchConfig`
- `createSourceConfig`

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
