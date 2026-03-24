# @voxmedia/oat-docs-config

Configuration helpers for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @voxmedia/oat-docs-config @voxmedia/oat-docs-theme @voxmedia/oat-docs-transforms
```

Install the required Fumadocs, Next.js, and React peer dependencies in your app as well.

## Usage

`next.config.js`

```js
import { createDocsConfig } from '@voxmedia/oat-docs-config';

export default createDocsConfig({
  title: 'My Docs',
  description: 'Documentation site',
});
```

`source.config.ts`

```ts
import { createSourceConfig } from '@voxmedia/oat-docs-config';
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

## Exports

- `createDocsConfig`
- `createSearchConfig`
- `createSourceConfig`
