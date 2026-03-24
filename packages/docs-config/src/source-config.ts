import {
  remarkLinks,
  remarkMermaid,
  remarkTabs,
} from '@voxmedia/oat-docs-transforms';
import type { Root } from 'mdast';
import { remarkAlert } from 'remark-github-blockquote-alert';
import type { Plugin } from 'unified';

import { createSearchConfig, type SearchConfig } from './search-config.js';

// oxlint-disable-next-line typescript-eslint/no-explicit-any -- unified Plugin generics are covariant but typed invariantly
type RemarkPlugin = Plugin<any[], Root>;

export interface SourceConfigResult {
  remarkPlugins: RemarkPlugin[];
  contentDir: string;
  search: SearchConfig;
}

export function createSourceConfig(): SourceConfigResult {
  return {
    remarkPlugins: [remarkLinks, remarkTabs, remarkAlert, remarkMermaid],
    contentDir: './docs',
    search: createSearchConfig(),
  };
}
