import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

const mdxMocks = vi.hoisted(() => {
  const withMDX = vi.fn((config: Record<string, unknown>) => ({
    ...config,
    mdxWrapped: true,
  }));
  const createMDX = vi.fn(() => withMDX);

  return { createMDX, withMDX };
});

vi.mock('fumadocs-mdx/next', () => ({
  createMDX: mdxMocks.createMDX,
}));

import { createDocsConfig, type DocsConfigOptions } from './next-config.js';

describe('createDocsConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose only basePath as an option at the type level', () => {
    expectTypeOf<DocsConfigOptions>().toEqualTypeOf<{ basePath?: string }>();
  });

  it('should return a wrapped Next.js config with static export settings', () => {
    const config = createDocsConfig({});

    expect(config).toMatchObject({
      output: 'export',
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
    });
    expect(config).not.toHaveProperty('basePath');
    expect(config).toHaveProperty('mdxWrapped', true);

    expect(mdxMocks.createMDX).toHaveBeenCalledTimes(1);
    expect(mdxMocks.withMDX).toHaveBeenCalledWith({
      output: 'export',
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
    });
  });

  it('should set basePath when provided before wrapping with MDX', () => {
    const config = createDocsConfig({ basePath: '/my-project' });

    expect(config).toMatchObject({
      output: 'export',
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
      basePath: '/my-project',
    });
    expect(config).toHaveProperty('mdxWrapped', true);
    expect(mdxMocks.withMDX).toHaveBeenCalledWith({
      output: 'export',
      trailingSlash: true,
      images: { unoptimized: true },
      reactStrictMode: true,
      basePath: '/my-project',
    });
  });
});
