import { DocsLayout } from '@open-agent-toolkit/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import './globals.css';
import StaticSearchDialog from '@/components/search';
import { source } from '@/lib/source';

export const metadata = {
  title: '{{SITE_NAME}}',
  description: '{{SITE_DESCRIPTION}}',
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
              title: '{{SITE_NAME}}',
              description: '{{SITE_DESCRIPTION}}',
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
