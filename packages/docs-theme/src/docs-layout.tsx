import type { Root } from 'fumadocs-core/page-tree';
import { DocsLayout as FumaDocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';

import type { BrandingConfig } from './types.js';

export interface DocsLayoutProps {
  branding: BrandingConfig;
  tree: Root;
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
