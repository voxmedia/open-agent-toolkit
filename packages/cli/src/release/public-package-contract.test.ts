import { describe, expect, it } from 'vitest';

import { getPublicPackageContracts } from './public-package-contract';

describe('getPublicPackageContracts', () => {
  it('defines the four public packages for the first release', () => {
    const contracts = getPublicPackageContracts();

    expect(contracts).toHaveLength(4);
    expect(contracts.map((contract) => contract.publicName)).toEqual([
      '@voxmedia/oat-cli',
      '@voxmedia/oat-docs-config',
      '@voxmedia/oat-docs-theme',
      '@voxmedia/oat-docs-transforms',
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
        publicName: '@voxmedia/oat-cli',
        role: 'cli',
        requiredMetadataFields: expect.arrayContaining([
          'repository',
          'homepage',
          'bugs',
          'license',
          'files',
          'publishConfig.access',
        ]),
        requiredPaths: expect.arrayContaining(['dist/index.js', 'assets']),
        forbiddenPathPatterns: expect.arrayContaining([
          'src/**',
          '**/*.test.*',
          'tsconfig.tsbuildinfo',
        ]),
      }),
      expect.objectContaining({
        publicName: '@voxmedia/oat-docs-config',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
        ]),
      }),
      expect.objectContaining({
        publicName: '@voxmedia/oat-docs-theme',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
        ]),
      }),
      expect.objectContaining({
        publicName: '@voxmedia/oat-docs-transforms',
        role: 'docs-library',
        requiredPaths: expect.arrayContaining([
          'dist/index.js',
          'dist/index.d.ts',
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
});
