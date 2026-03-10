import { DocsPage, Mermaid } from '@oat/docs-theme';
import { notFound } from 'next/navigation';

import { source } from '@/lib/source';

const mdxComponents = { Mermaid };

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <MDX components={mdxComponents} />
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
