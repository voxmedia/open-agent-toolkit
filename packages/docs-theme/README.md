# @tkstang/oat-docs-theme

Shared React components for OAT-powered Fumadocs apps.

## Install

```bash
pnpm add @tkstang/oat-docs-theme
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
} from '@tkstang/oat-docs-theme';

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
