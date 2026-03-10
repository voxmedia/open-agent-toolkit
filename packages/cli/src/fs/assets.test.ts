import { describe, expect, it } from 'vitest';

import { resolveAssetsRoot } from './assets';

describe('resolveAssetsRoot', () => {
  it('resolves to packages/cli/assets', async () => {
    const root = await resolveAssetsRoot();

    expect(root).toMatch(/packages\/cli\/assets$/);
  });
});
