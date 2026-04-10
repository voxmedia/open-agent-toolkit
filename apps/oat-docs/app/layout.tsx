import { DocsLayout } from '@open-agent-toolkit/docs-theme';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

import './globals.css';
import { source } from '@/lib/source';

const basePath = '/open-agent-toolkit';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <RootProvider
          search={{
            options: {
              type: 'static' as const,
              // Static search does not inherit Next.js basePath automatically.
              api: `${basePath}/api/search`,
            },
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
