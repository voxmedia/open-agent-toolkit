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

## Docs

- [Docs Tooling](https://voxmedia.github.io/open-agent-toolkit/docs-tooling)
- [Repository](https://github.com/voxmedia/open-agent-toolkit)
