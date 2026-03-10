import type { Root } from 'mdast';
import type { Plugin } from 'unified';
import { remarkMermaid } from './remark-mermaid.js';
import { remarkTabs } from './remark-tabs.js';

export { remarkMermaid } from './remark-mermaid.js';
export { remarkTabs } from './remark-tabs.js';

export const defaultTransforms: Plugin<[], Root>[] = [
  remarkTabs,
  remarkMermaid,
];
