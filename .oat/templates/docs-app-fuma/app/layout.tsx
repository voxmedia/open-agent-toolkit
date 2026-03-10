import { DocsLayout } from '@oat/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/lib/source';
import 'fumadocs-ui/style.css';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <RootProvider>
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
