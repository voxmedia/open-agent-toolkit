import type { Root } from 'mdast';
import type { Plugin } from 'unified';

import { remarkLinks } from './remark-links.js';
import { remarkMermaid } from './remark-mermaid.js';
import { remarkTabs } from './remark-tabs.js';

export { remarkLinks } from './remark-links.js';
export { remarkMermaid } from './remark-mermaid.js';
export { remarkTabs } from './remark-tabs.js';

export const defaultTransforms: Plugin<[], Root>[] = [
  remarkLinks,
  remarkTabs,
  remarkMermaid,
];
