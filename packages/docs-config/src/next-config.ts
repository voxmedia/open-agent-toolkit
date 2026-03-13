import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

export interface DocsConfigOptions {
  title: string;
  description?: string;
  logo?: string;
  basePath?: string;
}

export function createDocsConfig(options: DocsConfigOptions): NextConfig {
  const baseConfig: NextConfig = {
    output: 'export',
    images: { unoptimized: true },
    reactStrictMode: true,
    ...(options.basePath ? { basePath: options.basePath } : {}),
  };

  const withMDX = createMDX();
  return withMDX(baseConfig);
}
