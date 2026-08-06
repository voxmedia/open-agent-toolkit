import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveAssetsRoot, validateAssetsBundle } from './assets';

describe('resolveAssetsRoot', () => {
  it('resolves to packages/cli/assets', async () => {
    const root = await resolveAssetsRoot();

    expect(root).toMatch(/packages\/cli\/assets$/);
  });
});

describe('validateAssetsBundle', () => {
  it('accepts metadata matching the running CLI version', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        JSON.stringify({ schemaVersion: 1, oatVersion: '1.2.3' }),
        'utf8',
      );

      await expect(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      ).resolves.toBeUndefined();
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('rejects assets bundled for a different CLI version', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        JSON.stringify({ schemaVersion: 1, oatVersion: '1.2.2' }),
        'utf8',
      );

      await expect(validateAssetsBundle(assetsRoot, '1.2.3')).rejects.toThrow(
        'Bundled assets version mismatch: CLI 1.2.3, assets 1.2.2.',
      );
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('rejects a bundle without integrity metadata', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await expect(validateAssetsBundle(assetsRoot, '1.2.3')).rejects.toThrow(
        'Bundled asset metadata not found',
      );
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('rejects malformed integrity metadata', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        '{"schemaVersion":2,"oatVersion":"1.2.3"}',
        'utf8',
      );

      await expect(validateAssetsBundle(assetsRoot, '1.2.3')).rejects.toThrow(
        'Bundled asset metadata is invalid',
      );
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });
});
