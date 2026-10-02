import { describe, expect, it } from 'vitest';

import { themeVariantOf, withBasePath } from './image-src.js';

describe('themeVariantOf', () => {
  it.each([
    ['/diagrams/sync-and-drift-light.svg', 'light'],
    ['/diagrams/sync-and-drift-dark.svg', 'dark'],
    // Imported assets carry a content hash before the extension.
    [
      '/open-agent-toolkit/_next/static/media/sync-and-drift-dark.4f3a2b1c.svg',
      'dark',
    ],
    ['/img/screen-LIGHT.PNG?v=2', 'light'],
  ] as const)('reads %s as %s', (src, expected) => {
    expect(themeVariantOf(src)).toBe(expected);
  });

  it.each([
    '/diagrams/highlight.svg',
    '/diagrams/dark-mode-toggle.svg',
    '/diagrams/sync-and-drift.svg',
    undefined,
  ])('leaves %s visible in both themes', (src) => {
    expect(themeVariantOf(src)).toBeNull();
  });
});

describe('withBasePath', () => {
  it('prefixes a root-relative public path', () => {
    expect(withBasePath('/diagrams/a.svg', '/open-agent-toolkit')).toBe(
      '/open-agent-toolkit/diagrams/a.svg',
    );
  });

  it('does not prefix twice', () => {
    expect(
      withBasePath('/open-agent-toolkit/diagrams/a.svg', '/open-agent-toolkit'),
    ).toBe('/open-agent-toolkit/diagrams/a.svg');
  });

  it.each([
    'https://example.com/a.svg',
    '//cdn.example.com/a.svg',
    'diagrams/a.svg',
    'data:image/svg+xml,%3Csvg%3E',
  ])('leaves %s unchanged', (src) => {
    expect(withBasePath(src, '/open-agent-toolkit')).toBe(src);
  });

  it('is a no-op without a base path', () => {
    expect(withBasePath('/diagrams/a.svg', '')).toBe('/diagrams/a.svg');
  });
});
