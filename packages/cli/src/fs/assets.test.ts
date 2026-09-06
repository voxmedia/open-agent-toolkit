import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { CliError } from '@errors/index';
import { OAT_VERSION } from '@shared/oat-version';
import { describe, expect, it, vi } from 'vitest';

import { resolveAssetsRoot, validateAssetsBundle } from './assets';

const PACKAGED_ASSETS_PATTERN = /packages\/cli\/assets$/;

// The producer's top-level contract, restated here rather than imported from
// the validator. A fixture built from the implementation's own list could
// never catch that list drifting away from the directories
// `packages/cli/scripts/bundle-assets.sh` actually creates.
const REQUIRED_BUNDLE_DIRECTORIES = [
  'skills',
  'agents',
  'templates',
  'scripts',
  'docs',
  'migration',
  'config',
];

async function writeBundleMetadata(
  assetsRoot: string,
  oatVersion: string,
): Promise<void> {
  await writeFile(
    join(assetsRoot, 'bundle-metadata.json'),
    `${JSON.stringify({ schemaVersion: 1, oatVersion }, null, 2)}\n`,
    'utf8',
  );
}

async function createBundleDirectories(assetsRoot: string): Promise<void> {
  for (const directory of REQUIRED_BUNDLE_DIRECTORIES) {
    await mkdir(join(assetsRoot, directory));
  }
}

/**
 * A structurally complete bundle: every directory the producer creates, plus
 * matching metadata. Fixtures must carry the full shape or they would keep
 * legitimising the metadata-only bundles this validator exists to reject.
 */
async function createBundle(oatVersion: string): Promise<string> {
  const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-override-'));

  await createBundleDirectories(assetsRoot);
  await writeBundleMetadata(assetsRoot, oatVersion);

  return assetsRoot;
}

/** A truncated bundle: valid metadata and none of the producer's content. */
async function createMetadataOnlyBundle(oatVersion: string): Promise<string> {
  const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-metadata-only-'));

  await writeBundleMetadata(assetsRoot, oatVersion);

  return assetsRoot;
}

async function captureRejection(
  operation: Promise<unknown>,
): Promise<CliError> {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(CliError);
    return error as CliError;
  }

  throw new Error('Expected the bundle to be rejected, but it resolved.');
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

  // The regression this validation exists for: an override whose metadata is
  // perfectly valid but which carries no content at all must not resolve, or
  // every downstream command reads it as a legitimate empty installation.
  it('fails closed when an explicit override carries only bundle metadata', async () => {
    const assetsRoot = await createMetadataOnlyBundle(OAT_VERSION);

    try {
      const error = await captureRejection(
        resolveAssetsRoot({ OAT_ASSETS_DIR: assetsRoot }),
      );

      expect(error.message).toContain(
        `Bundled assets are incomplete: required directory not found: ${join(assetsRoot, 'skills')}.`,
      );
      expect(error.exitCode).toBe(2);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });
});

describe('validateAssetsBundle', () => {
  it('accepts metadata matching the running CLI version', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await createBundleDirectories(assetsRoot);
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
      await createBundleDirectories(assetsRoot);
      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        JSON.stringify({ schemaVersion: 1, oatVersion: '1.2.2' }),
        'utf8',
      );

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(
        'Bundled assets version mismatch: CLI 1.2.3, assets 1.2.2.',
      );
      expect(error.exitCode).toBe(2);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('rejects a bundle without integrity metadata', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain('Bundled asset metadata not found');
      expect(error.exitCode).toBe(2);
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

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain('Bundled asset metadata is invalid');
      expect(error.exitCode).toBe(2);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('rejects a bundle that carries only integrity metadata', async () => {
    const assetsRoot = await createMetadataOnlyBundle('1.2.3');

    try {
      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(
        `Bundled assets are incomplete: required directory not found: ${join(assetsRoot, 'skills')}.`,
      );
      expect(error.exitCode).toBe(2);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it.each(REQUIRED_BUNDLE_DIRECTORIES)(
    'rejects a bundle missing its %s directory',
    async (directory) => {
      const assetsRoot = await createBundle('1.2.3');
      const directoryPath = join(assetsRoot, directory);

      try {
        await rm(directoryPath, { recursive: true, force: true });

        const error = await captureRejection(
          validateAssetsBundle(assetsRoot, '1.2.3'),
        );

        expect(error.message).toContain(
          `Bundled assets are incomplete: required directory not found: ${directoryPath}.`,
        );
        expect(error.exitCode).toBe(2);
      } finally {
        await rm(assetsRoot, { recursive: true, force: true });
      }
    },
  );

  it.each(REQUIRED_BUNDLE_DIRECTORIES)(
    'rejects a bundle whose %s entry is a file rather than a directory',
    async (directory) => {
      const assetsRoot = await createBundle('1.2.3');
      const directoryPath = join(assetsRoot, directory);

      try {
        await rm(directoryPath, { recursive: true, force: true });
        await writeFile(directoryPath, 'not a directory', 'utf8');

        const error = await captureRejection(
          validateAssetsBundle(assetsRoot, '1.2.3'),
        );

        expect(error.message).toContain(
          `Bundled assets are incomplete: required bundle path is not a directory: ${directoryPath}.`,
        );
        expect(error.exitCode).toBe(2);
      } finally {
        await rm(assetsRoot, { recursive: true, force: true });
      }
    },
  );

  // Two gaps, one diagnosis: the reported path is the first in the producer's
  // own order, so the same broken bundle always produces the same message.
  it('reports the first missing directory in producer order', async () => {
    const assetsRoot = await createBundle('1.2.3');

    try {
      await rm(join(assetsRoot, 'docs'), { recursive: true, force: true });
      await rm(join(assetsRoot, 'agents'), { recursive: true, force: true });

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(join(assetsRoot, 'agents'));
      expect(error.message).not.toContain(join(assetsRoot, 'docs'));
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  // A `stat` that fails for any reason other than "absent" must not be read as
  // a tolerable gap. A self-referential symlink raises ELOOP for every user,
  // including root, so it stands in for the permission and I/O failures that
  // would otherwise be silently reported as a missing directory.
  it('fails closed when a required directory cannot be read', async () => {
    const assetsRoot = await createBundle('1.2.3');
    const skillsPath = join(assetsRoot, 'skills');

    try {
      await rm(skillsPath, { recursive: true, force: true });
      await symlink(skillsPath, skillsPath);

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(
        `Bundled assets are unreadable: required directory could not be read: ${skillsPath}.`,
      );
      expect(error.exitCode).toBe(2);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  // Structural validation is the last check, not the first: a bundle that is
  // both truncated and mislabelled still reports the metadata problem, so the
  // primary diagnosis does not change under this validator.
  it('reports a metadata failure before a structural failure', async () => {
    const assetsRoot = await mkdtemp(join(tmpdir(), 'oat-assets-'));

    try {
      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        '{"schemaVersion":2,"oatVersion":"1.2.3"}',
        'utf8',
      );

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain('Bundled asset metadata is invalid');
      expect(error.message).not.toContain('Bundled assets are incomplete');
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  it('reports a version mismatch before a structural failure', async () => {
    const assetsRoot = await createMetadataOnlyBundle('1.2.2');

    try {
      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(
        'Bundled assets version mismatch: CLI 1.2.3, assets 1.2.2.',
      );
      expect(error.message).not.toContain('Bundled assets are incomplete');
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });
});
