import { execFile } from 'node:child_process';
import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { REQUIRED_BUNDLE_DIRECTORIES } from '@fs/assets';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { isVersionPolicyIgnoredPath } from '../../../../tools/release/release-utils';
import { findMissingBuildArtifacts } from '../../../../tools/release/validate-public-packages';
import { findLockstepVersionBumpErrors } from '../../../../tools/release/validate-public-packages';
import { packPublicPackage } from '../../../../tools/release/validate-public-packages';
import {
  findForbiddenPackedPaths,
  findMissingMetadataFields,
  findMissingPackedPaths,
  findMissingPackedTextContents,
  findNonPublicWorkspaceDependencySpecs,
  findWorkspaceProtocolDependencySpecs,
  getPublicPackageContracts,
} from './public-package-contract';

const cliPackageJsonPath = fileURLToPath(
  new URL('../../package.json', import.meta.url),
);
const controlPlanePackageJsonPath = fileURLToPath(
  new URL('../../../control-plane/package.json', import.meta.url),
);
const docsConfigPackageJsonPath = fileURLToPath(
  new URL('../../../docs-config/package.json', import.meta.url),
);
const docsThemePackageJsonPath = fileURLToPath(
  new URL('../../../docs-theme/package.json', import.meta.url),
);
const docsTransformsPackageJsonPath = fileURLToPath(
  new URL('../../../docs-transforms/package.json', import.meta.url),
);
const docsAppPackageJsonPath = fileURLToPath(
  new URL('../../../../apps/oat-docs/package.json', import.meta.url),
);
const workspaceRootPackageJsonPath = fileURLToPath(
  new URL('../../../../package.json', import.meta.url),
);
const cliTsconfigPath = fileURLToPath(
  new URL('../../tsconfig.json', import.meta.url),
);
const bundleAssetsScriptPath = fileURLToPath(
  new URL('../../scripts/bundle-assets.sh', import.meta.url),
);
const execFileAsync = promisify(execFile);

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('getPublicPackageContracts', () => {
  it('defines the five public packages for release publishing', () => {
    const contracts = getPublicPackageContracts();

    expect(contracts).toHaveLength(5);
    expect(contracts.map((contract) => contract.publicName)).toEqual([
      '@open-agent-toolkit/cli',
      '@open-agent-toolkit/control-plane',
      '@open-agent-toolkit/docs-config',
      '@open-agent-toolkit/docs-theme',
      '@open-agent-toolkit/docs-transforms',
    ]);
    expect(contracts.map((contract) => contract.workspaceDir)).toEqual([
      'packages/cli',
      'packages/control-plane',
      'packages/docs-config',
      'packages/docs-theme',
      'packages/docs-transforms',
    ]);
  });

  it('captures role and artifact expectations for each package', () => {
    const contracts = getPublicPackageContracts();

    expect(contracts).toEqual([
      expect.objectContaining({
        publicName: '@open-agent-toolkit/cli',
        role: 'cli',
        requiredMetadataFields: expect.arrayContaining([
          'repository',
          'homepage',
          'bugs',
          'license',
          'files',
          'publishConfig.access',
        ]),
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'assets',
          'assets/agents/oat-reviewer.md',
          'assets/scripts/generate-oat-state.sh',
          'assets/docs/index.md',
          'assets/config/dispatch-matrix-recommendation.json',
          'assets/migration/pjm-restructure.md',
          'assets/templates/decision.md',
          'assets/templates/repo-agents.md',
          'assets/templates/pjm-agents.md',
          'assets/templates/reference-agents.md',
          'assets/skills/explainer-kit/scripts/lib/package-coverage.mjs',
          'assets/skills/explainer-kit/scripts/lib/source-backlinks.mjs',
          'assets/NOTICES.md',
          'README.md',
        ]),
        requiredPackedTextFiles: [
          expect.objectContaining({
            path: 'assets/NOTICES.md',
            requiredContents: expect.arrayContaining([
              '**Source:** https://github.com/obra/superpowers',
              '**Version referenced:** 5.0.7',
              expect.stringContaining('Copyright (c) 2025 Jesse Vincent'),
              '**Source:** https://github.com/shadcn/improve/tree/main/skills/improve',
              '**Version referenced:** `main` (retrieved 2026-07-12)',
              expect.stringContaining('Copyright (c) 2026 shadcn'),
              '**Source:** https://github.com/nicobailon/visual-explainer',
              '**Version referenced:** 0.8.1',
              expect.stringContaining('Copyright (c) 2025 Nico Bailon'),
            ]),
          }),
          {
            path: 'assets/skills/explainer-kit/scripts/lib/package-coverage.mjs',
            requiredContents: [
              'explainer-kit.package-coverage/v2',
              'export function requiredImmutablePackagePaths',
              'export async function validateImmutablePackageEvidence',
            ],
          },
          {
            path: 'assets/skills/explainer-kit/scripts/lib/source-backlinks.mjs',
            requiredContents: [
              'explainer-kit.source-backlinks/v1',
              'export function parseCanonicalGithubBlobUrl',
            ],
          },
        ],
        versionPolicyAdditionalRoots: expect.arrayContaining([
          '.agents/skills',
          '.agents/agents',
          '.oat/templates',
          '.oat/scripts',
          'apps/oat-docs/docs',
        ]),
        versionPolicyIgnorePatterns: expect.arrayContaining(['assets/**']),
        forbiddenPathPatterns: expect.arrayContaining([
          'src/**',
          '**/*.test.*',
          '**/__tests__/**',
          'tsconfig.tsbuildinfo',
        ]),
      }),
      expect.objectContaining({
        publicName: '@open-agent-toolkit/control-plane',
        role: 'support-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
      expect.objectContaining({
        publicName: '@open-agent-toolkit/docs-config',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
      expect.objectContaining({
        publicName: '@open-agent-toolkit/docs-theme',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
      expect.objectContaining({
        publicName: '@open-agent-toolkit/docs-transforms',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
    ]);
  });

  it('guards a packed path under every required bundle directory', () => {
    const cliContract = getPublicPackageContracts()[0];

    // Derived from the runtime list rather than a restatement of the seven
    // names: an eighth directory added to `REQUIRED_BUNDLE_DIRECTORIES`
    // without a matching contract entry has to fail here, because at runtime
    // `validateBundleStructure` would exit 2 on a tarball that packed without
    // it.
    const unguardedDirectories = REQUIRED_BUNDLE_DIRECTORIES.filter(
      (directory) =>
        !cliContract.requiredPaths.some((requiredPath) =>
          requiredPath.startsWith(`assets/${directory}/`),
        ),
    );

    expect(unguardedDirectories).toEqual([]);
  });

  it('uses unique workspace directories and public names', () => {
    const contracts = getPublicPackageContracts();
    const publicNames = contracts.map((contract) => contract.publicName);
    const workspaceDirs = contracts.map((contract) => contract.workspaceDir);

    expect(new Set(publicNames).size).toBe(publicNames.length);
    expect(new Set(workspaceDirs).size).toBe(workspaceDirs.length);
  });

  it('reports missing metadata fields for release validation', () => {
    const cliContract = getPublicPackageContracts()[0];
    const missingFields = findMissingMetadataFields(
      {
        name: cliContract.publicName,
        repository: { type: 'git' },
        homepage: 'https://example.com',
        files: ['dist'],
        publishConfig: {},
      },
      cliContract,
    );

    expect(missingFields).toEqual([
      'bugs',
      'license',
      'publishConfig.access',
      'bin.oat',
    ]);
  });

  it('reports missing and forbidden packed paths for release validation', () => {
    const cliContract = getPublicPackageContracts()[0];
    const packedPaths = [
      'dist/index.js',
      'assets/bundle-metadata.json',
      'assets/agents/oat-reviewer.md',
      'assets/scripts/generate-oat-state.sh',
      'assets/docs/index.md',
      'assets/config/dispatch-matrix-recommendation.json',
      'assets/migration/pjm-restructure.md',
      'assets/templates/decision.md',
      'assets/templates/repo-agents.md',
      'assets/templates/pjm-agents.md',
      'assets/templates/reference-agents.md',
      'assets/skills/explainer-kit/scripts/lib/package-coverage.mjs',
      'assets/skills/explainer-kit/scripts/lib/source-backlinks.mjs',
      'assets/NOTICES.md',
      'README.md',
      'src/index.ts',
      'dist/commands/__tests__/helpers.js',
      'tsconfig.tsbuildinfo',
    ];

    expect(findMissingPackedPaths(packedPaths, cliContract)).toEqual([]);
    expect(findForbiddenPackedPaths(packedPaths, cliContract)).toEqual([
      'src/index.ts',
      'dist/commands/__tests__/helpers.js',
      'tsconfig.tsbuildinfo',
    ]);
  });

  it('requires complete third-party notice provenance in the real packed CLI payload', async () => {
    const cliContract = getPublicPackageContracts()[0];
    const packageDir = await mkdtemp(join(tmpdir(), 'oat-cli-notice-pack-'));

    try {
      await mkdir(join(packageDir, 'dist'), { recursive: true });
      await writeFile(join(packageDir, 'dist', 'index.js'), '', 'utf8');
      await writeFile(
        join(packageDir, 'README.md'),
        '# CLI pack fixture\n',
        'utf8',
      );
      await writeFile(
        join(packageDir, 'package.json'),
        `${JSON.stringify(
          {
            name: cliContract.publicName,
            version: '0.0.0-notice-test',
            files: ['dist', 'assets', 'README.md'],
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
      await execFileAsync('bash', [bundleAssetsScriptPath], {
        env: {
          ...process.env,
          OAT_ASSETS_DIR: join(packageDir, 'assets'),
        },
      });

      const packedArtifact = await packPublicPackage(cliContract, packageDir);
      const packedPaths = packedArtifact.files.map((file) => file.path);

      expect(findMissingPackedPaths(packedPaths, cliContract)).toEqual([]);
      expect(
        findMissingPackedTextContents(packedArtifact.textFiles, cliContract),
      ).toEqual([]);
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  }, 20_000);

  it('excludes nested test support without mutating built package output', async () => {
    const cliContract = getPublicPackageContracts()[0];
    const cliPackageRoot = dirname(cliPackageJsonPath);
    const cliTsconfig = await readJson(cliTsconfigPath);
    const packageJson = await readJson(cliPackageJsonPath);
    const distIndexPath = join(cliPackageRoot, 'dist', 'index.js');
    const assetsMetadataPath = join(
      cliPackageRoot,
      'assets',
      'bundle-metadata.json',
    );
    const outputBeforePack = await Promise.all([
      readFile(distIndexPath),
      readFile(assetsMetadataPath),
    ]);

    expect(cliTsconfig.exclude).toContain('src/**/__tests__/**');
    expect((packageJson.scripts as Record<string, string>).build).toContain(
      'find dist -type d -name __tests__',
    );

    await expect(
      access(join(cliPackageRoot, 'dist', '__tests__', 'synced-fixture.js')),
    ).rejects.toThrow();
    const packedArtifact = await packPublicPackage(cliContract);
    const packedPaths = packedArtifact.files.map((file) => file.path);
    expect(
      packedPaths.filter((path) => path.split('/').includes('__tests__')),
    ).toEqual([]);
    await expect(readFile(distIndexPath)).resolves.toEqual(outputBeforePack[0]);
    await expect(readFile(assetsMetadataPath)).resolves.toEqual(
      outputBeforePack[1],
    );
  }, 30_000);

  it('rejects notice payloads reduced to attribution summaries', () => {
    const cliContract = getPublicPackageContracts()[0];

    expect(
      findMissingPackedTextContents(
        {
          'assets/NOTICES.md':
            'Obra Superpowers, shadcn/improve, and visual-explainer are MIT licensed.',
        },
        cliContract,
      ),
    ).toHaveLength(11);
  });

  it('reports workspace protocol dependency specs from packed package metadata', () => {
    expect(
      findWorkspaceProtocolDependencySpecs({
        dependencies: {
          '@open-agent-toolkit/docs-transforms': 'workspace:*',
          chalk: '^5.6.2',
        },
        devDependencies: {
          '@open-agent-toolkit/cli': 'workspace:^',
        },
      }),
    ).toEqual([
      'dependencies.@open-agent-toolkit/docs-transforms=workspace:*',
      'devDependencies.@open-agent-toolkit/cli=workspace:^',
    ]);
  });

  it('reports packed dependencies on non-public workspace packages', () => {
    expect(
      findNonPublicWorkspaceDependencySpecs(
        {
          dependencies: {
            '@open-agent-toolkit/control-plane': '0.0.1',
            '@open-agent-toolkit/docs-config': '0.0.27',
            chalk: '^5.6.2',
          },
        },
        [
          '@open-agent-toolkit/cli',
          '@open-agent-toolkit/docs-config',
          '@open-agent-toolkit/docs-theme',
          '@open-agent-toolkit/docs-transforms',
        ],
        [
          '@open-agent-toolkit/control-plane',
          '@open-agent-toolkit/docs-config',
        ],
      ),
    ).toEqual(['dependencies.@open-agent-toolkit/control-plane=0.0.1']);
  });

  it('ignores generated version metadata for release version policy checks', () => {
    const cliContract = getPublicPackageContracts()[0];

    expect(
      isVersionPolicyIgnoredPath(
        cliContract,
        'packages/cli/assets/public-package-versions.json',
      ),
    ).toBe(true);
    expect(
      isVersionPolicyIgnoredPath(
        cliContract,
        'packages/cli/assets/skills/oat-project-document/SKILL.md',
      ),
    ).toBe(true);
    expect(
      isVersionPolicyIgnoredPath(
        cliContract,
        '.agents/skills/oat-project-document/SKILL.md',
      ),
    ).toBe(false);
  });

  it('reports missing build artifacts before packing', async () => {
    const docsThemeContract = getPublicPackageContracts().find(
      (contract) => contract.publicName === '@open-agent-toolkit/docs-theme',
    );
    expect(docsThemeContract).toBeDefined();
    const packageDir = await mkdtemp(join(tmpdir(), 'oat-release-validate-'));
    await mkdir(join(packageDir, 'dist'), { recursive: true });
    await writeFile(join(packageDir, 'dist', 'index.js'), '', 'utf8');
    await writeFile(join(packageDir, 'README.md'), '', 'utf8');

    await expect(
      findMissingBuildArtifacts(packageDir, docsThemeContract!),
    ).resolves.toEqual(['dist/index.d.ts']);
  });

  it('requires lockstep version bumps when a public package changes', () => {
    const contracts = getPublicPackageContracts();

    expect(
      findLockstepVersionBumpErrors([
        {
          contract: contracts[0],
          changedSinceBase: true,
          currentVersion: '0.0.4',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[1],
          changedSinceBase: false,
          currentVersion: '0.0.4',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[2],
          changedSinceBase: false,
          currentVersion: '0.0.4',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[3],
          changedSinceBase: false,
          currentVersion: '0.0.4',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[4],
          changedSinceBase: false,
          currentVersion: '0.0.4',
          baseVersion: '0.0.4',
        },
      ]),
    ).toEqual([
      'publishable package changes require a lockstep version bump across all public packages. Changed packages: @open-agent-toolkit/cli. Packages still at their base version: @open-agent-toolkit/cli@0.0.4, @open-agent-toolkit/control-plane@0.0.4, @open-agent-toolkit/docs-config@0.0.4, @open-agent-toolkit/docs-theme@0.0.4, @open-agent-toolkit/docs-transforms@0.0.4',
    ]);
  });

  it('allows lockstep bumps when publishable package changes are versioned together', () => {
    const contracts = getPublicPackageContracts();

    expect(
      findLockstepVersionBumpErrors(
        contracts.map((contract) => ({
          contract,
          changedSinceBase: contract.publicName === '@open-agent-toolkit/cli',
          currentVersion: '0.0.5',
          baseVersion: '0.0.4',
        })),
      ),
    ).toEqual([]);
  });

  it('rejects divergent public package versions even when they are bumped', () => {
    const contracts = getPublicPackageContracts();

    expect(
      findLockstepVersionBumpErrors([
        {
          contract: contracts[0],
          changedSinceBase: true,
          currentVersion: '0.0.5',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[1],
          changedSinceBase: false,
          currentVersion: '0.0.6',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[2],
          changedSinceBase: false,
          currentVersion: '0.0.5',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[3],
          changedSinceBase: false,
          currentVersion: '0.0.5',
          baseVersion: '0.0.4',
        },
        {
          contract: contracts[4],
          changedSinceBase: false,
          currentVersion: '0.0.5',
          baseVersion: '0.0.4',
        },
      ]),
    ).toEqual([
      'public packages must stay on the same version for lockstep release publishes. Found: @open-agent-toolkit/cli@0.0.5, @open-agent-toolkit/control-plane@0.0.6, @open-agent-toolkit/docs-config@0.0.5, @open-agent-toolkit/docs-theme@0.0.5, @open-agent-toolkit/docs-transforms@0.0.5',
    ]);
  });

  it('matches the CLI package manifest to the public contract', async () => {
    const cliContract = getPublicPackageContracts()[0];
    const packageJson = await readJson(cliPackageJsonPath);

    expect(packageJson.name).toBe(cliContract.publicName);
    expect(packageJson.private).toBe(false);
    expect(packageJson.license).toBe('MIT');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/voxmedia/open-agent-toolkit.git',
      directory: 'packages/cli',
    });
    expect(packageJson.homepage).toBe(
      'https://github.com/voxmedia/open-agent-toolkit/tree/main/packages/cli',
    );
    expect(packageJson.bugs).toEqual({
      url: 'https://github.com/voxmedia/open-agent-toolkit/issues',
    });
    expect(packageJson.files).toEqual(['dist', 'assets', 'README.md']);
    expect(packageJson.publishConfig).toEqual({ access: 'public' });
    expect(packageJson.bin).toEqual({ oat: 'dist/index.js' });
  });

  it('matches the docs package manifests to the public contract', async () => {
    const contracts = getPublicPackageContracts().filter(
      (contract) => contract.role !== 'cli',
    );
    const manifests = await Promise.all([
      readJson(controlPlanePackageJsonPath),
      readJson(docsConfigPackageJsonPath),
      readJson(docsThemePackageJsonPath),
      readJson(docsTransformsPackageJsonPath),
    ]);

    for (const [index, contract] of contracts.entries()) {
      const packageJson = manifests[index];

      expect(packageJson.name).toBe(contract.publicName);
      expect(packageJson.private).toBe(false);
      expect(packageJson.license).toBe('MIT');
      expect(packageJson.repository).toEqual({
        type: 'git',
        url: 'git+https://github.com/voxmedia/open-agent-toolkit.git',
        directory: contract.workspaceDir,
      });
      expect(packageJson.homepage).toBe(
        `https://github.com/voxmedia/open-agent-toolkit/tree/main/${contract.workspaceDir}`,
      );
      expect(packageJson.bugs).toEqual({
        url: 'https://github.com/voxmedia/open-agent-toolkit/issues',
      });
      expect(packageJson.files).toEqual(['dist', 'README.md']);
      expect(packageJson.publishConfig).toEqual({ access: 'public' });
      expect(packageJson.main).toBe('dist/index.js');
      expect(packageJson.types).toBe('dist/index.d.ts');
      expect(packageJson.exports).toEqual({
        '.': {
          types: './dist/index.d.ts',
          import: './dist/index.js',
        },
      });
    }

    expect(manifests[1].dependencies).toMatchObject({
      '@open-agent-toolkit/docs-transforms': 'workspace:*',
    });
  });

  it('keeps workspace consumers aligned to the renamed package identities', async () => {
    const docsAppPackageJson = await readJson(docsAppPackageJsonPath);
    const workspaceRootPackageJson = await readJson(
      workspaceRootPackageJsonPath,
    );

    expect(docsAppPackageJson.dependencies).toMatchObject({
      '@open-agent-toolkit/docs-config': 'workspace:*',
      '@open-agent-toolkit/docs-theme': 'workspace:*',
      '@open-agent-toolkit/docs-transforms': 'workspace:*',
    });
    expect(docsAppPackageJson.devDependencies).toMatchObject({
      '@open-agent-toolkit/cli': 'workspace:*',
    });
    expect(workspaceRootPackageJson.scripts).toMatchObject({
      'cli:link':
        'pnpm run build --filter=@open-agent-toolkit/cli && cd packages/cli && pnpm link --global',
    });
  });
});

describe('packed bundle directory guards', () => {
  // One real bundle is built for the whole block. Each control then packs its
  // own copy, so emptying a directory for one case cannot leak into another.
  let bundledPackageDir = '';

  beforeAll(async () => {
    const cliContract = getPublicPackageContracts()[0];
    bundledPackageDir = await mkdtemp(join(tmpdir(), 'oat-cli-bundle-guard-'));

    await mkdir(join(bundledPackageDir, 'dist'), { recursive: true });
    await writeFile(join(bundledPackageDir, 'dist', 'index.js'), '', 'utf8');
    await writeFile(
      join(bundledPackageDir, 'README.md'),
      '# CLI pack fixture\n',
      'utf8',
    );
    await writeFile(
      join(bundledPackageDir, 'package.json'),
      `${JSON.stringify(
        {
          name: cliContract.publicName,
          version: '0.0.0-bundle-guard-test',
          files: ['dist', 'assets', 'README.md'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    await execFileAsync('bash', [bundleAssetsScriptPath], {
      env: {
        ...process.env,
        OAT_ASSETS_DIR: join(bundledPackageDir, 'assets'),
      },
    });
  }, 60_000);

  afterAll(async () => {
    if (bundledPackageDir) {
      await rm(bundledPackageDir, { recursive: true, force: true });
    }
  });

  it('packs every required path from the unmodified control bundle', async () => {
    const cliContract = getPublicPackageContracts()[0];
    const packedArtifact = await packPublicPackage(
      cliContract,
      bundledPackageDir,
    );
    const packedPaths = packedArtifact.files.map((file) => file.path);

    expect(findMissingPackedPaths(packedPaths, cliContract)).toEqual([]);
  }, 20_000);

  it.each([
    ['agents', 'assets/agents/oat-reviewer.md'],
    ['docs', 'assets/docs/index.md'],
  ])(
    'fails release validation when a required bundle directory is empty in the tarball (assets/%s)',
    async (directory, missingPath) => {
      const cliContract = getPublicPackageContracts()[0];
      const caseRoot = await mkdtemp(join(tmpdir(), 'oat-cli-empty-dir-pack-'));
      const packageDir = join(caseRoot, 'package');

      try {
        await cp(bundledPackageDir, packageDir, { recursive: true });

        // Empty the directory but leave it on disk. `bundle-assets.sh` creates
        // all seven directories unconditionally, so a real producer regression
        // leaves an empty directory rather than a missing one, and `npm pack`
        // then silently drops it from the tarball. Deleting the directory
        // outright would not reproduce that shape. This case isolates the
        // packed-tarball layer; the same contract entries also make
        // `findMissingBuildArtifacts` reject this workspace before packing.
        const emptiedDirectory = join(packageDir, 'assets', directory);
        await rm(emptiedDirectory, { recursive: true, force: true });
        await mkdir(emptiedDirectory);
        await expect(access(emptiedDirectory)).resolves.toBeUndefined();

        const packedArtifact = await packPublicPackage(cliContract, packageDir);
        const packedPaths = packedArtifact.files.map((file) => file.path);

        expect(
          packedPaths.filter((path) => path.startsWith(`assets/${directory}/`)),
        ).toEqual([]);
        // Exactly the emptied directory's guard, and nothing else: the bare
        // `assets` entry is still satisfied by the rest of the bundle, which is
        // why it never caught this.
        expect(findMissingPackedPaths(packedPaths, cliContract)).toEqual([
          missingPath,
        ]);
      } finally {
        await rm(caseRoot, { recursive: true, force: true });
      }
    },
    20_000,
  );
});
