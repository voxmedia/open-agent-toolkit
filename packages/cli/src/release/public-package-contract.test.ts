import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { findMissingBuildArtifacts } from '../../../../tools/release/validate-public-packages';
import {
  findForbiddenPackedPaths,
  findMissingMetadataFields,
  findMissingPackedPaths,
  findWorkspaceProtocolDependencySpecs,
  getPublicPackageContracts,
} from './public-package-contract';

const cliPackageJsonPath = fileURLToPath(
  new URL('../../package.json', import.meta.url),
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

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('getPublicPackageContracts', () => {
  it('defines the four public packages for the first release', () => {
    const contracts = getPublicPackageContracts();

    expect(contracts).toHaveLength(4);
    expect(contracts.map((contract) => contract.publicName)).toEqual([
      '@tkstang/oat-cli',
      '@tkstang/oat-docs-config',
      '@tkstang/oat-docs-theme',
      '@tkstang/oat-docs-transforms',
    ]);
    expect(contracts.map((contract) => contract.workspaceDir)).toEqual([
      'packages/cli',
      'packages/docs-config',
      'packages/docs-theme',
      'packages/docs-transforms',
    ]);
  });

  it('captures role and artifact expectations for each package', () => {
    const contracts = getPublicPackageContracts();

    expect(contracts).toEqual([
      expect.objectContaining({
        publicName: '@tkstang/oat-cli',
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
          'README.md',
        ]),
        forbiddenPathPatterns: expect.arrayContaining([
          'src/**',
          '**/*.test.*',
          'tsconfig.tsbuildinfo',
        ]),
      }),
      expect.objectContaining({
        publicName: '@tkstang/oat-docs-config',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
      expect.objectContaining({
        publicName: '@tkstang/oat-docs-theme',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
          'README.md',
        ]),
      }),
      expect.objectContaining({
        publicName: '@tkstang/oat-docs-transforms',
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
      'assets/docs/index.md',
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

  it('reports workspace protocol dependency specs from packed package metadata', () => {
    expect(
      findWorkspaceProtocolDependencySpecs({
        dependencies: {
          '@tkstang/oat-docs-transforms': 'workspace:*',
          chalk: '^5.6.2',
        },
        devDependencies: {
          '@tkstang/oat-cli': 'workspace:^',
        },
      }),
    ).toEqual([
      'dependencies.@tkstang/oat-docs-transforms=workspace:*',
      'devDependencies.@tkstang/oat-cli=workspace:^',
    ]);
  });

  it('reports missing build artifacts before packing', async () => {
    const docsThemeContract = getPublicPackageContracts()[2];
    const packageDir = await mkdtemp(join(tmpdir(), 'oat-release-validate-'));
    await mkdir(join(packageDir, 'dist'), { recursive: true });
    await writeFile(join(packageDir, 'dist', 'index.js'), '', 'utf8');
    await writeFile(join(packageDir, 'README.md'), '', 'utf8');

    await expect(
      findMissingBuildArtifacts(packageDir, docsThemeContract),
    ).resolves.toEqual(['dist/index.d.ts']);
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
    const contracts = getPublicPackageContracts().slice(1);
    const manifests = await Promise.all([
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

    expect(manifests[0].dependencies).toMatchObject({
      '@tkstang/oat-docs-transforms': 'workspace:*',
    });
  });

  it('keeps workspace consumers aligned to the renamed package identities', async () => {
    const docsAppPackageJson = await readJson(docsAppPackageJsonPath);
    const workspaceRootPackageJson = await readJson(
      workspaceRootPackageJsonPath,
    );

    expect(docsAppPackageJson.dependencies).toMatchObject({
      '@tkstang/oat-docs-config': 'workspace:*',
      '@tkstang/oat-docs-theme': 'workspace:*',
      '@tkstang/oat-docs-transforms': 'workspace:*',
    });
    expect(docsAppPackageJson.devDependencies).toMatchObject({
      '@tkstang/oat-cli': 'workspace:*',
    });
    expect(workspaceRootPackageJson.scripts).toMatchObject({
      'cli:link':
        'pnpm run build --filter=@tkstang/oat-cli && cd packages/cli && pnpm link --global',
    });
  });
});
