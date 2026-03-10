import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

export interface DocsConfigOptions {
  title: string;
  description?: string;
  logo?: string;
}

export function createDocsConfig(_options: DocsConfigOptions): NextConfig {
  const baseConfig: NextConfig = {
    output: 'export',
    images: { unoptimized: true },
    reactStrictMode: true,
  };

  const withMDX = createMDX();
  return withMDX(baseConfig);
}
