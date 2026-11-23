# @open-agent-toolkit/docs-theme

Shared React components for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @open-agent-toolkit/docs-theme
```

Install the required Fumadocs and React peer dependencies in your app as well.

## Usage

```tsx
import {
  DocsLayout,
  DocsPage,
  Mermaid,
  Tab,
  Tabs,
} from '@open-agent-toolkit/docs-theme';

export function Layout({ tree, children }) {
  return (
    <DocsLayout branding={{ title: 'My Docs' }} tree={tree}>
      {children}
    </DocsLayout>
  );
}

export function Page({ toc, chart }) {
  return (
    <DocsPage toc={toc}>
      <Tabs>
        <Tab title='Diagram'>
          <Mermaid chart={chart} />
        </Tab>
      </Tabs>
    </DocsPage>
  );
}
```

### Figure fences

The `docs-*` figure fences from `@open-agent-toolkit/docs-transforms` (`docs-steps`, `docs-tree`, `docs-timeline`, `docs-terminal`, `docs-decision`, `docs-check`, `docs-compare` and `docs-annotate`) render through this package's static figure components. Wrap your MDX component map in `withDocsFigures`, and import `figures.css` from your Tailwind stylesheet after the Fumadocs CSS:

```tsx
import {
  Mermaid,
  Tab,
  Tabs,
  withDocsFigures,
  ZoomImage,
} from '@open-agent-toolkit/docs-theme';
import defaultComponents from 'fumadocs-ui/mdx';

const mdxComponents = withDocsFigures({
  ...defaultComponents,
  Mermaid,
  Tab,
  Tabs,
  img: ZoomImage,
});
```

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/black.css';
@import 'fumadocs-ui/css/preset.css';
@import '@open-agent-toolkit/docs-theme/figures.css';

@source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js';
```

`withDocsFigures` adds the eight `Docs*` components and marks any host tag the map overrides (`p`, `li`, `pre`, `table`, `a`, …), so figures still read their Markdown children; a `Docs*` entry already in the map is kept. Without it, the first page that uses a figure fails with MDX's "Expected component `DocsTree` to be defined" error. `figures.css` defines only `--graph-*` and `--color-graph-*` tokens, mapping the accent and muted tokens onto `--color-fd-*`, plus the frame utilities, so an app's own tokens are never overridden. The `@source` line generates the components' Tailwind classes. The figures are server components with no animation, so they render fully visible without JavaScript.

## Exports

- `DocsLayout`
- `DocsPage`
- `Mermaid`
- `Tab`
- `Tabs`
- `withDocsFigures`: adds the figure components to an MDX component map.
- `DocsSteps`, `DocsTree`, `DocsTimeline`, `DocsTerminal`, `DocsDecision`,
  `DocsCheck`, `DocsCompare` and `DocsAnnotate`: the figure components, with
  their `Docs*Props` types, and `DOCS_FIGURE_COMPONENTS`, their names.
- `figures.css` (`@open-agent-toolkit/docs-theme/figures.css`): figure tokens
  and utilities. The figure components are vendored from
  [mdxcn](https://mdxcn.dev) (MIT); each module carries the full notice.
- `ZoomImage`: Markdown image renderer. Map it as `img` in your MDX
  components.
  - SVG images open in a full-screen view that renders them at least 900px
    wide, so diagram text stays legible on a phone; the reader pans to see the
    rest. Other images open in Fumadocs `ImageZoom`.
  - Root-relative paths such as `/diagrams/x.svg` get the site base path
    (`NEXT_PUBLIC_BASE_PATH`, which `@open-agent-toolkit/docs-config` sets
    from `basePath`).
  - Files named `<name>-light.<ext>` / `<name>-dark.<ext>` show only in the
    matching theme. Add
    `@source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js';`
    to your Tailwind CSS so those theme classes are generated.

`Mermaid` renders Mermaid diagram source with [Pele](https://pele.run), loading
each diagram type on demand. Diagrams take their colors from the site's
Fumadocs color tokens (`--color-fd-*`) through Pele's `--pele-*` CSS variables,
so they follow light and dark mode without re-rendering, and open in the same
full-screen view when clicked. To recolor diagrams, set the `--color-fd-*`
tokens: the component sets `--pele-*` inline, which overrides any `--pele-*`
values in a stylesheet. Equations written as `$$...$$` in labels and messages
render as MathML through KaTeX, which loads only for diagrams that contain
them; no KaTeX stylesheet is needed.

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
