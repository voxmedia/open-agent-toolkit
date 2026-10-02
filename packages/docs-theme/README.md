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
  components. Every image opens in a zoom view on click, root-relative paths
  get the site base path (`NEXT_PUBLIC_BASE_PATH`, which
  `@open-agent-toolkit/docs-config` sets from `basePath`), and files named
  `<name>-light.<ext>` / `<name>-dark.<ext>` show only in the matching theme.
  Add `@source '../node_modules/@open-agent-toolkit/docs-theme/dist/**/*.js';`
  to your Tailwind CSS so the theme classes are generated.

`Mermaid` diagrams open full screen when clicked.

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
