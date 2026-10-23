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

export const customRemarkPlugins = [remarkTabs, remarkLinks, remarkMermaid];
```

Tabs must run before link rewriting so links in tab bodies are rewritten too. Tab bodies are reparsed with GFM support, including tables and task lists; nested tab groups are supported. Fenced Syntax examples remain literal code. `remarkMermaid` emits the theme component JSX and converts literal `\n` label escapes to `<br/>`; it does not validate diagram syntax.

## Exports

- `defaultTransforms`
- `remarkLinks`
- `remarkMermaid`
- `remarkTabs`

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
