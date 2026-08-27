import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { OAT_VERSION } from '@shared/oat-version';
import { describe, expect, it, vi } from 'vitest';

import { resolveAssetsRoot, validateAssetsBundle } from './assets';

const PACKAGED_ASSETS_PATTERN = /packages\/cli\/assets$/;

async function createBundle(oatVersion: string): Promise<string> {
  const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-override-'));

  await writeFile(
    join(assetsRoot, 'bundle-metadata.json'),
    `${JSON.stringify({ schemaVersion: 1, oatVersion }, null, 2)}\n`,
    'utf8',
  );

  return assetsRoot;
}

describe('resolveAssetsRoot', () => {
  // The only case that calls through the default `env` parameter — the binding
  // every production call site uses. `vi.stubEnv` neutralises an ambient
  // OAT_ASSETS_DIR through vitest's managed seam (auto-restored, no direct
  // `process.env` assignment) so the assertion stays hard instead of skipping.
  it('defaults to the packaged root when the ambient environment sets no override', async () => {
    vi.stubEnv('OAT_ASSETS_DIR', '');

    try {
      const root = await resolveAssetsRoot();

      expect(root).toMatch(PACKAGED_ASSETS_PATTERN);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('resolves a valid OAT_ASSETS_DIR override instead of the packaged root', async () => {
    const assetsRoot = await createBundle(OAT_VERSION);

    try {
      const root = await resolveAssetsRoot({ OAT_ASSETS_DIR: assetsRoot });

      expect(root).toBe(assetsRoot);
      expect(root).not.toMatch(PACKAGED_ASSETS_PATTERN);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('resolves a relative override against the process working directory', async () => {
    const assetsRoot = await createBundle(OAT_VERSION);
    const relativeOverride = relative(process.cwd(), assetsRoot);

    try {
      expect(relativeOverride).not.toBe(assetsRoot);

      const root = await resolveAssetsRoot({
        OAT_ASSETS_DIR: relativeOverride,
      });

      expect(root).toBe(resolve(process.cwd(), relativeOverride));
      expect(root).toBe(assetsRoot);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('falls back to the packaged root when no override is set', async () => {
    const root = await resolveAssetsRoot({});

    expect(root).toMatch(PACKAGED_ASSETS_PATTERN);
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
  ])(
    'falls back to the packaged root for an %s override',
    async (_label, value) => {
      const root = await resolveAssetsRoot({ OAT_ASSETS_DIR: value });

      expect(root).toMatch(PACKAGED_ASSETS_PATTERN);
    },
  );

  it('fails closed when an explicit override directory is missing', async () => {
    const missingRoot = join(tmpdir(), 'oat-assets-override-missing-root');

    await expect(
      resolveAssetsRoot({ OAT_ASSETS_DIR: missingRoot }),
    ).rejects.toThrow(`Assets directory not found: ${missingRoot}.`);
  });

  it('fails closed when an explicit override is not a directory', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'oat-assets-override-file-'));
    const filePath = join(parent, 'assets');

    try {
      await writeFile(filePath, 'not a directory', 'utf8');

      await expect(
        resolveAssetsRoot({ OAT_ASSETS_DIR: filePath }),
      ).rejects.toThrow(`Assets path is not a directory: ${filePath}`);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it('fails closed when an explicit override has no bundle metadata', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-override-'));

    try {
      await expect(
        resolveAssetsRoot({ OAT_ASSETS_DIR: assetsRoot }),
      ).rejects.toThrow('Bundled asset metadata not found');
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('fails closed when an explicit override is version-mismatched', async () => {
    const assetsRoot = await createBundle('0.0.0-override-mismatch');

    try {
      await expect(
        resolveAssetsRoot({ OAT_ASSETS_DIR: assetsRoot }),
      ).rejects.toThrow(
        `Bundled assets version mismatch: CLI ${OAT_VERSION}, assets 0.0.0-override-mismatch.`,
      );
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
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
