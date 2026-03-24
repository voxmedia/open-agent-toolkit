import { DocsPage, Mermaid, Tab, Tabs } from '@voxmedia/oat-docs-theme';
import defaultComponents from 'fumadocs-ui/mdx';
import { notFound } from 'next/navigation';

import { source } from '@/lib/source';

const mdxComponents = { ...defaultComponents, Mermaid, Tab, Tabs };

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
  return [
    { slug: undefined },
    ...source.generateParams().filter((p) => p.slug.length > 0),
  ];
}
