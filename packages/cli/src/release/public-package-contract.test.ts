import { execFile } from 'node:child_process';
import {
  access,
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

import { describe, expect, it } from 'vitest';

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
      'assets/docs/index.md',
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
      'tsconfig.tsbuildinfo',
    ];

    expect(findMissingPackedPaths(packedPaths, cliContract)).toEqual([]);
    expect(findForbiddenPackedPaths(packedPaths, cliContract)).toEqual([
      'src/index.ts',
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

  it('excludes root test-support fixtures from the real CLI build and package', async () => {
    const cliContract = getPublicPackageContracts()[0];
    const workspaceRoot = dirname(workspaceRootPackageJsonPath);
    const cliPackageRoot = dirname(cliPackageJsonPath);

    await execFileAsync('pnpm', ['--filter', cliContract.publicName, 'build'], {
      cwd: workspaceRoot,
    });

    await expect(
      access(join(cliPackageRoot, 'dist', '__tests__', 'synced-fixture.js')),
    ).rejects.toThrow();
    const packedArtifact = await packPublicPackage(cliContract);
    const packedPaths = packedArtifact.files.map((file) => file.path);
    expect(
      packedPaths.filter((path) => path.startsWith('dist/__tests__/')),
    ).toEqual([]);
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
