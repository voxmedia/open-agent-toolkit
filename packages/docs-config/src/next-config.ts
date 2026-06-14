import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

export interface DocsConfigOptions {
  basePath?: string;
}

export function createDocsConfig(options: DocsConfigOptions): NextConfig {
  const baseConfig: NextConfig = {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    reactStrictMode: true,
    ...(options.basePath ? { basePath: options.basePath } : {}),
  };

  const withMDX = createMDX();
  return withMDX(baseConfig);
}
