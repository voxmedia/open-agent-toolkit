import { DocsLayout } from '@oat/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { source } from '@/lib/source';
import './globals.css';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <RootProvider search={{ options: { type: 'static' as const } }}>
          <DocsLayout
            branding={{
              title: 'Oat Docs Documentation',
              description: 'Documentation for Open Agent Toolkit',
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
