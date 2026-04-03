# @open-agent-toolkit/docs-transforms

Remark plugins and default transform bundle for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @open-agent-toolkit/docs-transforms
```

## Usage

```ts
import {
  defaultTransforms,
  remarkLinks,
  remarkMermaid,
  remarkTabs,
} from '@open-agent-toolkit/docs-transforms';

export const remarkPlugins = defaultTransforms;

export const customRemarkPlugins = [remarkLinks, remarkTabs, remarkMermaid];
```

## Exports

- `defaultTransforms`
- `remarkLinks`
- `remarkMermaid`
- `remarkTabs`
