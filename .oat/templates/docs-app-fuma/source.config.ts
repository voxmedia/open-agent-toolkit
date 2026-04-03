import { createSourceConfig } from '@open-agent-toolkit/docs-config';
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
