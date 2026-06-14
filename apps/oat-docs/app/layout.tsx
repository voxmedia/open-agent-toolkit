import { DocsLayout } from '@open-agent-toolkit/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import './globals.css';
import StaticSearchDialog from '@/components/search';
import { source } from '@/lib/source';

export const metadata = {
  title: 'Open Agent Toolkit',
  description:
    'An open-source toolkit for portable, provider-agnostic agent tooling and workflows.',
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <RootProvider
          search={{
            SearchDialog: StaticSearchDialog,
          }}
        >
          <DocsLayout
            branding={{
              title: 'Open Agent Toolkit',
              description:
                'An open-source toolkit for portable, provider-agnostic agent tooling and workflows.',
            }}
            tree={source.getPageTree()}
          >
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
