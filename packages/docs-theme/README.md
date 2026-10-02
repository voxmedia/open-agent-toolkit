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

## Exports

- `DocsLayout`
- `DocsPage`
- `Mermaid`
- `Tab`
- `Tabs`
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

`Mermaid` diagrams take their colors from the site's Fumadocs color tokens
(`--color-fd-*`) in light and dark mode, and open in the same full-screen view
when clicked.

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
