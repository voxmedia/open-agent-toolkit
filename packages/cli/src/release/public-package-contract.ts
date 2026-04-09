import { matchesGlob } from 'node:path';

export interface PublicPackageContract {
  workspaceDir: string;
  publicName: string;
  role: 'cli' | 'docs-library';
  requiredMetadataFields: string[];
  requiredPaths: string[];
  forbiddenPathPatterns: string[];
  versionPolicyIgnorePatterns: string[];
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

const PUBLIC_PACKAGE_CONTRACTS: PublicPackageContract[] = [
  {
    workspaceDir: 'packages/cli',
    publicName: '@open-agent-toolkit/cli',
    role: 'cli',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'bin.oat'],
    requiredPaths: ['dist/index.js', 'assets', 'README.md'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyIgnorePatterns: ['assets/public-package-versions.json'],
  },
  {
    workspaceDir: 'packages/docs-config',
    publicName: '@open-agent-toolkit/docs-config',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyIgnorePatterns: [],
  },
  {
    workspaceDir: 'packages/docs-theme',
    publicName: '@open-agent-toolkit/docs-theme',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
    versionPolicyIgnorePatterns: [],
  },
  {
    workspaceDir: 'packages/docs-transforms',
    publicName: '@open-agent-toolkit/docs-transforms',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts', 'README.md'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
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
    forbiddenPathPatterns: [...contract.forbiddenPathPatterns],
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
