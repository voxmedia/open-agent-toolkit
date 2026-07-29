import { matchesGlob } from 'node:path';

export interface PublicPackageContract {
  workspaceDir: string;
  publicName: string;
  role: 'cli' | 'docs-library' | 'support-library';
  requiredMetadataFields: string[];
  requiredPaths: string[];
  requiredPackedTextFiles: PackedTextFileRequirement[];
  forbiddenPathPatterns: string[];
  versionPolicyAdditionalRoots: string[];
  versionPolicyIgnorePatterns: string[];
}

export interface PackedTextFileRequirement {
  path: string;
  requiredContents: string[];
}

const COMMON_METADATA_FIELDS = [
  'repository',
  'homepage',
  'bugs',
  'license',
  'files',
  'publishConfig.access',
] as const;

const COMMON_FORBIDDEN_PATH_PATTERNS = [
  'src/**',
  '**/*.test.*',
  'tsconfig.tsbuildinfo',
] as const;

const PACKED_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const;

const MIT_LICENSE_BODY = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const PUBLIC_PACKAGE_CONTRACTS: PublicPackageContract[] = [
  {
    workspaceDir: 'packages/cli',
    publicName: '@open-agent-toolkit/cli',
    role: 'cli',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'bin.oat'],
    requiredPaths: [
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
    ],
    requiredPackedTextFiles: [
      {
        path: 'assets/NOTICES.md',
        requiredContents: [
          '**Source:** https://github.com/obra/superpowers',
          '**Version referenced:** 5.0.7',
          `Copyright (c) 2025 Jesse Vincent\n\n${MIT_LICENSE_BODY}`,
          '**Source:** https://github.com/shadcn/improve/tree/main/skills/improve',
          '**Version referenced:** `main` (retrieved 2026-07-12)',
          `Copyright (c) 2026 shadcn\n\n${MIT_LICENSE_BODY}`,
          '**Source:** https://github.com/nicobailon/visual-explainer',
          '**Version referenced:** 0.8.1',
          `Copyright (c) 2025 Nico Bailon\n\n${MIT_LICENSE_BODY}`,
        ],
      },
      {
        path: 'assets/skills/explainer-kit/scripts/lib/package-coverage.mjs',
        requiredContents: [
          'explainer-kit.package-coverage/v1',
          'export function requiredImmutablePackagePaths',
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
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyAdditionalRoots: [
      '.agents/skills',
      '.agents/agents',
      '.oat/templates',
      '.oat/scripts',
      'apps/oat-docs/docs',
    ],
    versionPolicyIgnorePatterns: ['assets/**'],
  },
  {
    workspaceDir: 'packages/control-plane',
    publicName: '@open-agent-toolkit/control-plane',
    role: 'support-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    requiredPackedTextFiles: [],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyAdditionalRoots: [],
    versionPolicyIgnorePatterns: [],
  },
  {
    workspaceDir: 'packages/docs-config',
    publicName: '@open-agent-toolkit/docs-config',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    requiredPackedTextFiles: [],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyAdditionalRoots: [],
    versionPolicyIgnorePatterns: [],
  },
  {
    workspaceDir: 'packages/docs-theme',
    publicName: '@open-agent-toolkit/docs-theme',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    requiredPackedTextFiles: [],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyAdditionalRoots: [],
    versionPolicyIgnorePatterns: [],
  },
  {
    workspaceDir: 'packages/docs-transforms',
    publicName: '@open-agent-toolkit/docs-transforms',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    requiredPackedTextFiles: [],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyAdditionalRoots: [],
    versionPolicyIgnorePatterns: [],
  },
];

function getMetadataValue(
  packageJson: Record<string, unknown>,
  fieldPath: string,
): unknown {
  return fieldPath.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, packageJson);
}

function hasRequiredPackPath(
  packedPaths: readonly string[],
  requiredPath: string,
): boolean {
  return packedPaths.some(
    (packedPath) =>
      packedPath === requiredPath || packedPath.startsWith(`${requiredPath}/`),
  );
}

export function getPublicPackageContracts(): PublicPackageContract[] {
  return PUBLIC_PACKAGE_CONTRACTS.map((contract) => ({
    ...contract,
    requiredMetadataFields: [...contract.requiredMetadataFields],
    requiredPaths: [...contract.requiredPaths],
    requiredPackedTextFiles: contract.requiredPackedTextFiles.map(
      (requirement) => ({
        ...requirement,
        requiredContents: [...requirement.requiredContents],
      }),
    ),
    forbiddenPathPatterns: [...contract.forbiddenPathPatterns],
    versionPolicyAdditionalRoots: [...contract.versionPolicyAdditionalRoots],
    versionPolicyIgnorePatterns: [...contract.versionPolicyIgnorePatterns],
  }));
}

export function findMissingMetadataFields(
  packageJson: Record<string, unknown>,
  contract: PublicPackageContract,
): string[] {
  return contract.requiredMetadataFields.filter(
    (fieldPath) => getMetadataValue(packageJson, fieldPath) === undefined,
  );
}

export function findMissingPackedPaths(
  packedPaths: readonly string[],
  contract: PublicPackageContract,
): string[] {
  return contract.requiredPaths.filter(
    (requiredPath) => !hasRequiredPackPath(packedPaths, requiredPath),
  );
}

export function findForbiddenPackedPaths(
  packedPaths: readonly string[],
  contract: PublicPackageContract,
): string[] {
  return packedPaths.filter((packedPath) =>
    contract.forbiddenPathPatterns.some((pattern) =>
      matchesGlob(packedPath, pattern),
    ),
  );
}

export function findMissingPackedTextContents(
  packedTextFiles: Readonly<Record<string, string>>,
  contract: PublicPackageContract,
): string[] {
  const missing: string[] = [];

  for (const requirement of contract.requiredPackedTextFiles) {
    const contents = packedTextFiles[requirement.path];
    if (contents === undefined) {
      missing.push(`${requirement.path} (missing file)`);
      continue;
    }

    for (const requiredContent of requirement.requiredContents) {
      if (!contents.includes(requiredContent)) {
        missing.push(
          `${requirement.path} (missing ${requiredContent.split('\n')[0]})`,
        );
      }
    }
  }

  return missing;
}

export function findWorkspaceProtocolDependencySpecs(
  packageJson: Record<string, unknown>,
): string[] {
  const workspaceSpecs: string[] = [];

  for (const dependencyField of PACKED_DEPENDENCY_FIELDS) {
    const dependencies = packageJson[dependencyField];
    if (!dependencies || typeof dependencies !== 'object') {
      continue;
    }

    for (const [dependencyName, spec] of Object.entries(
      dependencies as Record<string, unknown>,
    )) {
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        workspaceSpecs.push(`${dependencyField}.${dependencyName}=${spec}`);
      }
    }
  }

  return workspaceSpecs;
}

export function findNonPublicWorkspaceDependencySpecs(
  packageJson: Record<string, unknown>,
  publicPackageNames: readonly string[],
  workspacePackageNames: readonly string[],
): string[] {
  const publicPackageNameSet = new Set(publicPackageNames);
  const workspacePackageNameSet = new Set(workspacePackageNames);
  const invalidSpecs: string[] = [];

  for (const dependencyField of PACKED_DEPENDENCY_FIELDS) {
    const dependencies = packageJson[dependencyField];
    if (!dependencies || typeof dependencies !== 'object') {
      continue;
    }

    for (const [dependencyName, spec] of Object.entries(
      dependencies as Record<string, unknown>,
    )) {
      if (
        workspacePackageNameSet.has(dependencyName) &&
        !publicPackageNameSet.has(dependencyName)
      ) {
        invalidSpecs.push(
          `${dependencyField}.${dependencyName}=${String(spec)}`,
        );
      }
    }
  }

  return invalidSpecs;
}
