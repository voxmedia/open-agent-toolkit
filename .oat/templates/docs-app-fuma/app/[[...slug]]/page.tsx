import { DocsPage, Mermaid, Tab, Tabs } from '@open-agent-toolkit/docs-theme';
import defaultComponents from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { source } from '@/lib/source';

const mdxComponents = { ...defaultComponents, Mermaid, Tab, Tabs };

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
  };
}

export default async function Page(props: PageProps) {
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
