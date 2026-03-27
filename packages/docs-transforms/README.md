# @tkstang/oat-docs-transforms

Remark plugins and default transform bundle for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @tkstang/oat-docs-transforms
```

## Usage

```ts
import {
  defaultTransforms,
  remarkLinks,
  remarkMermaid,
  remarkTabs,
} from '@tkstang/oat-docs-transforms';

export const remarkPlugins = defaultTransforms;

export const customRemarkPlugins = [remarkLinks, remarkTabs, remarkMermaid];
```

## Exports

- `defaultTransforms`
- `remarkLinks`
- `remarkMermaid`
- `remarkTabs`
