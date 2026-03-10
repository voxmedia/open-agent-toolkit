import type { PageTree } from 'fumadocs-core/server';
import { DocsLayout as FumaDocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

import type { BrandingConfig } from './types.js';

export interface DocsLayoutProps {
  branding: BrandingConfig;
  tree: PageTree.Root;
  children: ReactNode;
}

export function DocsLayout({ branding, tree, children }: DocsLayoutProps) {
  return (
    <FumaDocsLayout
      nav={{
        title: branding.title,
      }}
      tree={tree}
    >
      {children}
    </FumaDocsLayout>
  );
}
