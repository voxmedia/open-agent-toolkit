export interface PublicPackageContract {
  workspaceDir: string;
  publicName: string;
  role: 'cli' | 'docs-library';
  requiredMetadataFields: string[];
  requiredPaths: string[];
  forbiddenPathPatterns: string[];
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

const PUBLIC_PACKAGE_CONTRACTS: PublicPackageContract[] = [
  {
    workspaceDir: 'packages/cli',
    publicName: '@voxmedia/oat-cli',
    role: 'cli',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'bin.oat'],
    requiredPaths: ['dist/index.js', 'assets'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
  },
  {
    workspaceDir: 'packages/docs-config',
    publicName: '@voxmedia/oat-docs-config',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
  },
  {
    workspaceDir: 'packages/docs-theme',
    publicName: '@voxmedia/oat-docs-theme',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
  },
  {
    workspaceDir: 'packages/docs-transforms',
    publicName: '@voxmedia/oat-docs-transforms',
    role: 'docs-library',
    requiredMetadataFields: [...COMMON_METADATA_FIELDS, 'exports', 'types'],
    requiredPaths: ['dist/index.js', 'dist/index.d.ts'],
    forbiddenPathPatterns: [...COMMON_FORBIDDEN_PATH_PATTERNS],
  },
];

export function getPublicPackageContracts(): PublicPackageContract[] {
  return PUBLIC_PACKAGE_CONTRACTS.map((contract) => ({
    ...contract,
    requiredMetadataFields: [...contract.requiredMetadataFields],
    requiredPaths: [...contract.requiredPaths],
    forbiddenPathPatterns: [...contract.forbiddenPathPatterns],
  }));
}
