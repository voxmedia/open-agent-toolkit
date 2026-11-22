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
  remarkDocsFences,
  remarkLinks,
  remarkMermaid,
  remarkTabs,
} from '@open-agent-toolkit/docs-transforms';

export const remarkPlugins = defaultTransforms;

export const customRemarkPlugins = [
  remarkTabs,
  remarkDocsFences,
  remarkLinks,
  remarkMermaid,
];
```

Tabs must run before link rewriting so links in tab bodies are rewritten too. Tab bodies are reparsed with GFM support, including tables and task lists; nested tab groups are supported. Fenced Syntax examples remain literal code. `remarkMermaid` emits the theme component JSX and converts literal `\n` label escapes to `<br/>`; it does not validate diagram syntax.

`remarkDocsFences` turns the `docs-*` figure fences into the `Docs*` figure elements that `@open-agent-toolkit/docs-theme` renders through `withDocsFigures`. It runs after tabs, so figures work inside tab bodies, and before links, so `.md` links inside figures are rewritten. Fence meta such as `title="Project level"` becomes string props and a bare flag becomes `true`. Bodies are reparsed as GFM with positions mapped to the authored lines, except `docs-terminal`, whose body stays one raw code block. An unknown `docs-*` name fails the build with its line and the known names (`unknown-docs-fence`), and so does a `docs-*` fence nested inside a figure body (`nested-docs-fence`). `DOCS_FENCES` maps each fence name to its component name and body mode; it is the single fence-name list that the theme components and `oat docs check` are verified against.

`remarkLinks` accepts `{ contentRoot, getReaderFiles }`: an absolute content directory and a function returning its effective content-relative reader paths. `createSourceConfig` wires these from the app root and filtered collection patterns. Reader discovery is lazy per transformed document; failures propagate. Without these options, source-file context retains legacy `/docs/` inference and physical-file collision checks.

With actual source-file context, Markdown links preserve `/index` when a same-name `.md` or `.mdx` page owns the folder URL (for example, `contributing.md` and `contributing/index.md`). Both the current and target routes follow the pinned loader's collision behavior. Without filesystem context, ordinary index collapse remains the fallback.

## Exports

- `defaultTransforms`: `[remarkTabs, remarkDocsFences, remarkLinks, remarkMermaid]`
- `DOCS_FENCES`
- `remarkDocsFences`
- `remarkLinks`
- `remarkMermaid`
- `remarkTabs`
- `DocsFenceBody` (type): `'markdown' | 'raw'`

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
