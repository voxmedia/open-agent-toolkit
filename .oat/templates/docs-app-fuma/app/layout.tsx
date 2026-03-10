import { DocsLayout } from '@oat/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import './globals.css';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <RootProvider search={{ options: { type: 'static' as const } }}>
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
