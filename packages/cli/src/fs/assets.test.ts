import type { PathLike, Stats } from 'node:fs';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';

import { CliError } from '@errors/index';
import { OAT_VERSION } from '@shared/oat-version';
import { describe, expect, it, vi } from 'vitest';

import { resolveAssetsRoot, validateAssetsBundle } from './assets';

/**
 * Redirects, keyed by requested path, which real path `stat` is asked about.
 *
 * This is a seam rather than a substitute: every `Stats` the validator sees is
 * still produced by the filesystem from a real file or a real absence, so no
 * fixture here can encode a wrong model of one. It exists because the packaged
 * root is a genuine complete bundle during a test run, which leaves the
 * packaged half of the two root-level failures unreachable otherwise.
 */
const { statRedirects } = vi.hoisted(() => ({
  statRedirects: new Map<string, string>(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();

  return {
    ...actual,
    stat: (path: PathLike): Promise<Stats> =>
      actual.stat(statRedirects.get(String(path)) ?? path),
  };
});

const PACKAGED_ASSETS_PATTERN = /packages\/cli\/assets$/;

// The three remedy sentences, restated rather than imported. A test that asked
// the implementation for its own wording could never catch the override branch
// silently reverting to packaged guidance, which is the regression this whole
// change exists to prevent.
const OVERRIDE_REMEDY =
  'Check OAT_ASSETS_DIR and point it to a complete asset bundle built for this CLI version.';
const PACKAGED_BUNDLE_REMEDY =
  'Reinstall @open-agent-toolkit/cli or rebuild the CLI before updating tools.';
const PACKAGED_ROOT_REMEDY = "Run 'pnpm build' to generate bundled assets.";

const MISMATCHED_VERSION = '0.0.0-paired-mismatch';

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
  //
  // The errno is part of the diagnosis, not decoration: EACCES, ELOOP, and EIO
  // need different operator responses, and none of them is the remedy this
  // validator offers, so collapsing them into one "unreadable" verdict leaves
  // the reader with advice that does not apply and no way to tell why.
  it('fails closed, naming the errno, when a required directory cannot be read', async () => {
    const assetsRoot = await createBundle('1.2.3');
    const skillsPath = join(assetsRoot, 'skills');

    try {
      await rm(skillsPath, { recursive: true, force: true });
      await symlink(skillsPath, skillsPath);

      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expect(error.message).toContain(
        `Bundled assets are unreadable: required directory could not be read (ELOOP): ${skillsPath}.`,
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

/**
 * One fail-closed family, buildable twice so the same broken bundle can be
 * offered to the CLI as an explicit override and to the validator directly.
 *
 * `factualPrefix` is everything the diagnosis states about the bundle. The
 * remedy is deliberately not part of it: the contract under test is that this
 * prefix and the exit code stay identical across sources while only the
 * trailing advice changes.
 */
interface BundleFailureFamily {
  readonly label: string;
  readonly create: () => Promise<string>;
  readonly factualPrefix: (assetsRoot: string) => string;
}

// Every family reachable once a root has been accepted as a directory. All
// fixtures are built against OAT_VERSION so one fixture recipe produces the
// same failure through `resolveAssetsRoot` (which validates against the
// running CLI) and through a direct `validateAssetsBundle` call.
const BUNDLE_FAILURE_FAMILIES: BundleFailureFamily[] = [
  {
    label: 'metadata is missing',
    create: () => mkdtemp(join(tmpdir(), 'oat-assets-paired-no-metadata-')),
    factualPrefix: (assetsRoot) =>
      `Bundled asset metadata not found: ${join(assetsRoot, 'bundle-metadata.json')}.`,
  },
  {
    label: 'metadata is not JSON',
    create: async () => {
      const assetsRoot = await mkdtemp(
        join(tmpdir(), 'oat-assets-paired-bad-json-'),
      );

      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        '{ not json at all',
        'utf8',
      );

      return assetsRoot;
    },
    factualPrefix: (assetsRoot) =>
      `Bundled asset metadata is invalid: ${join(assetsRoot, 'bundle-metadata.json')}.`,
  },
  {
    label: 'metadata has the wrong shape',
    create: async () => {
      const assetsRoot = await mkdtemp(
        join(tmpdir(), 'oat-assets-paired-bad-shape-'),
      );

      await writeFile(
        join(assetsRoot, 'bundle-metadata.json'),
        '{"schemaVersion":2,"oatVersion":"1.2.3"}',
        'utf8',
      );

      return assetsRoot;
    },
    factualPrefix: (assetsRoot) =>
      `Bundled asset metadata is invalid: ${join(assetsRoot, 'bundle-metadata.json')}.`,
  },
  {
    label: 'the bundle is built for another CLI version',
    create: () => createBundle(MISMATCHED_VERSION),
    factualPrefix: () =>
      `Bundled assets version mismatch: CLI ${OAT_VERSION}, assets ${MISMATCHED_VERSION}.`,
  },
  {
    label: 'a required directory is missing',
    create: () => createMetadataOnlyBundle(OAT_VERSION),
    factualPrefix: (assetsRoot) =>
      `Bundled assets are incomplete: required directory not found: ${join(assetsRoot, 'skills')}.`,
  },
  {
    label: 'a required directory is a file',
    create: async () => {
      const assetsRoot = await createBundle(OAT_VERSION);
      const skillsPath = join(assetsRoot, 'skills');

      await rm(skillsPath, { recursive: true, force: true });
      await writeFile(skillsPath, 'not a directory', 'utf8');

      return assetsRoot;
    },
    factualPrefix: (assetsRoot) =>
      `Bundled assets are incomplete: required bundle path is not a directory: ${join(assetsRoot, 'skills')}.`,
  },
  {
    label: 'a required directory cannot be read',
    create: async () => {
      const assetsRoot = await createBundle(OAT_VERSION);
      const skillsPath = join(assetsRoot, 'skills');

      await rm(skillsPath, { recursive: true, force: true });
      await symlink(skillsPath, skillsPath);

      return assetsRoot;
    },
    factualPrefix: (assetsRoot) =>
      `Bundled assets are unreadable: required directory could not be read (ELOOP): ${join(assetsRoot, 'skills')}.`,
  },
];

/**
 * The remedy contract, asserted from both directions at once.
 *
 * Checking only that the override mentions OAT_ASSETS_DIR would pass a message
 * that also still told the operator to rebuild the package, so each source
 * asserts the presence of its own remedy and the absence of the other's.
 */
function expectOverrideRemedy(error: CliError): void {
  expect(error.message).toContain(OVERRIDE_REMEDY);
  expect(error.message).not.toContain(PACKAGED_BUNDLE_REMEDY);
  expect(error.message).not.toContain(PACKAGED_ROOT_REMEDY);
  expect(error.exitCode).toBe(2);
}

function expectPackagedRemedy(error: CliError, remedy: string): void {
  expect(error.message).toContain(remedy);
  expect(error.message).not.toContain(OVERRIDE_REMEDY);
  expect(error.message).not.toContain('OAT_ASSETS_DIR');
  expect(error.exitCode).toBe(2);
}

describe('source-aware remedies', () => {
  // The whole point of the change: the same broken bundle, reported twice, must
  // keep one factual diagnosis and one exit code while its advice follows the
  // root it was actually read from. Both halves are asserted in one test so a
  // future edit cannot satisfy one source by quietly breaking the other.
  it.each(BUNDLE_FAILURE_FAMILIES)(
    'gives each source its own remedy for the same diagnosis when $label',
    async (family) => {
      const overrideRoot = await family.create();
      const packagedRoot = await family.create();

      try {
        const overrideError = await captureRejection(
          resolveAssetsRoot({ OAT_ASSETS_DIR: overrideRoot }),
        );
        const packagedError = await captureRejection(
          validateAssetsBundle(packagedRoot, OAT_VERSION),
        );

        expect(overrideError.message).toContain(
          family.factualPrefix(overrideRoot),
        );
        expect(packagedError.message).toContain(
          family.factualPrefix(packagedRoot),
        );

        expectOverrideRemedy(overrideError);
        expectPackagedRemedy(packagedError, PACKAGED_BUNDLE_REMEDY);
      } finally {
        await rm(overrideRoot, { recursive: true, force: true });
        await rm(packagedRoot, { recursive: true, force: true });
      }
    },
  );

  it('tells the operator to check OAT_ASSETS_DIR when the override root is missing', async () => {
    const missingRoot = join(tmpdir(), 'oat-assets-paired-missing-root');

    const error = await captureRejection(
      resolveAssetsRoot({ OAT_ASSETS_DIR: missingRoot }),
    );

    expect(error.message).toContain(
      `Assets directory not found: ${missingRoot}.`,
    );
    expectOverrideRemedy(error);
  });

  it('tells the operator to check OAT_ASSETS_DIR when the override root is a file', async () => {
    const parent = await mkdtemp(
      join(tmpdir(), 'oat-assets-paired-root-file-'),
    );
    const filePath = join(parent, 'assets');

    try {
      await writeFile(filePath, 'not a directory', 'utf8');

      const error = await captureRejection(
        resolveAssetsRoot({ OAT_ASSETS_DIR: filePath }),
      );

      expect(error.message).toContain(
        `Assets path is not a directory: ${filePath}.`,
      );
      expectOverrideRemedy(error);
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  // The packaged half of the two root-level failures. The packaged root is a
  // real complete bundle whenever these tests run, so its absence and its
  // wrong-type failure are staged by pointing `stat` at a genuinely missing
  // path and a genuine file; the message must still name the packaged root the
  // CLI asked for, not the path that answered.
  it('keeps build guidance when the packaged root is missing', async () => {
    const packagedRoot = await resolveAssetsRoot({});
    const missingRoot = join(
      tmpdir(),
      'oat-assets-paired-missing-packaged-root',
    );

    statRedirects.set(packagedRoot, missingRoot);

    try {
      const error = await captureRejection(resolveAssetsRoot({}));

      expect(error.message).toContain(
        `Assets directory not found: ${packagedRoot}.`,
      );
      expectPackagedRemedy(error, PACKAGED_ROOT_REMEDY);
    } finally {
      statRedirects.delete(packagedRoot);
    }
  });

  it('keeps build guidance when the packaged root is not a directory', async () => {
    const packagedRoot = await resolveAssetsRoot({});
    const parent = await mkdtemp(
      join(tmpdir(), 'oat-assets-paired-packaged-file-'),
    );
    const filePath = join(parent, 'assets');

    await writeFile(filePath, 'not a directory', 'utf8');
    statRedirects.set(packagedRoot, filePath);

    try {
      const error = await captureRejection(resolveAssetsRoot({}));

      expect(error.message).toContain(
        `Assets path is not a directory: ${packagedRoot}.`,
      );
      expectPackagedRemedy(error, PACKAGED_ROOT_REMEDY);
    } finally {
      statRedirects.delete(packagedRoot);
      await rm(parent, { recursive: true, force: true });
    }
  });

  // A direct validator call has no environment to read, so it must keep the
  // guidance it had before this change rather than inheriting override wording
  // from some ambient default.
  it('defaults a direct validator call to packaged guidance', async () => {
    const assetsRoot = await createMetadataOnlyBundle('1.2.3');

    try {
      const error = await captureRejection(
        validateAssetsBundle(assetsRoot, '1.2.3'),
      );

      expectPackagedRemedy(error, PACKAGED_BUNDLE_REMEDY);
    } finally {
      await rm(assetsRoot, { recursive: true, force: true });
    }
  });

  // Source awareness is remedy wording only. A complete, version-matching
  // bundle is still accepted through either source, and a broken one is still
  // rejected through either source — the rows above already prove the second
  // half for every family.
  it.each([
    ['an explicit override', true],
    ['the packaged default', false],
  ])(
    'still accepts a complete bundle through %s',
    async (_label, viaOverride) => {
      const assetsRoot = await createBundle(OAT_VERSION);

      try {
        if (viaOverride) {
          await expect(
            resolveAssetsRoot({ OAT_ASSETS_DIR: assetsRoot }),
          ).resolves.toBe(assetsRoot);
        } else {
          await expect(
            validateAssetsBundle(assetsRoot, OAT_VERSION),
          ).resolves.toBeUndefined();
        }
      } finally {
        await rm(assetsRoot, { recursive: true, force: true });
      }
    },
  );
});
