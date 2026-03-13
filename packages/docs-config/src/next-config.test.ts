import { describe, expect, it, vi } from 'vitest';

vi.mock('fumadocs-mdx/next', () => ({
  createMDX: () => (config: Record<string, unknown>) => config,
}));

import { createDocsConfig } from './next-config.js';

describe('createDocsConfig', () => {
  it('should return a Next.js config with static export settings', () => {
    const config = createDocsConfig({ title: 'Test Docs' });

    expect(config.output).toBe('export');
    expect(config.trailingSlash).toBe(true);
    expect(config.images).toEqual({ unoptimized: true });
    expect(config.reactStrictMode).toBe(true);
  });

  it('should accept optional description and logo', () => {
    const config = createDocsConfig({
      title: 'My Docs',
      description: 'A test description',
      logo: '/logo.svg',
    });

    expect(config.output).toBe('export');
    expect(config.reactStrictMode).toBe(true);
  });

  it('should set basePath when provided', () => {
    const config = createDocsConfig({
      title: 'Test Docs',
      basePath: '/my-project',
    });

    expect(config.basePath).toBe('/my-project');
  });

  it('should not set basePath when omitted', () => {
    const config = createDocsConfig({ title: 'Test Docs' });

    expect(config.basePath).toBeUndefined();
  });
});
