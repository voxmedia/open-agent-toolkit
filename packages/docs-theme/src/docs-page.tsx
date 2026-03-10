import type { TableOfContents } from 'fumadocs-core/server';
import { DocsBody, DocsPage as FumaDocsPage } from 'fumadocs-ui/page';
import type { ReactNode } from 'react';

export interface DocsPageProps {
  toc: TableOfContents;
  children: ReactNode;
}

export function DocsPage({ toc, children }: DocsPageProps) {
  return (
    <FumaDocsPage toc={toc}>
      <DocsBody>{children}</DocsBody>
    </FumaDocsPage>
  );
}
