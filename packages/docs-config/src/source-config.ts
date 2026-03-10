import { remarkMermaid, remarkTabs } from '@oat/docs-transforms';
import type { Root } from 'mdast';
import { remarkAlert } from 'remark-github-blockquote-alert';
import type { Plugin } from 'unified';
import { createSearchConfig, type SearchConfig } from './search-config.js';

// biome-ignore lint/suspicious/noExplicitAny: unified Plugin generics are covariant but typed invariantly
type RemarkPlugin = Plugin<any[], Root>;

export interface SourceConfigResult {
  remarkPlugins: RemarkPlugin[];
  contentDir: string;
  search: SearchConfig;
}

export function createSourceConfig(): SourceConfigResult {
  return {
    remarkPlugins: [remarkTabs, remarkAlert, remarkMermaid],
    contentDir: './docs',
    search: createSearchConfig(),
  };
}
