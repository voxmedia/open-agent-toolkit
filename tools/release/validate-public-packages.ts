import { constants as fsConstants } from 'node:fs';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findForbiddenPackedPaths,
  findMissingMetadataFields,
  findMissingPackedPaths,
  findWorkspaceProtocolDependencySpecs,
  getPublicPackageContracts,
  type PublicPackageContract,
} from '../../packages/cli/src/release/public-package-contract';
import {
  findChangedWorkspaceDirs,
  getPackageVersion,
  readPackageJsonAtGitRef,
  REPO_ROOT,
  resolveMergeBase,
  runCommand,
} from './public-package-version-state';

interface PackedFileEntry {
  path: string;
}

interface PackedArtifact {
  filename: string;
  packageJson: Record<string, unknown>;
  files: PackedFileEntry[];
}

interface PackageValidationFailure {
  contract: PublicPackageContract | null;
  errors: string[];
}

export interface PublicPackageVersionState {
  contract: PublicPackageContract;
  changedSinceBase: boolean;
  currentVersion: string;
  baseVersion: string | null;
}

function getPackageDir(contract: PublicPackageContract): string {
  return join(REPO_ROOT, contract.workspaceDir);
}

export async function findMissingBuildArtifacts(
  packageDir: string,
  contract: PublicPackageContract,
): Promise<string[]> {
  const missing: string[] = [];

  for (const requiredPath of contract.requiredPaths) {
    try {
      await access(join(packageDir, requiredPath), fsConstants.F_OK);
    } catch {
      missing.push(requiredPath);
    }
  }

  return missing;
}

async function readPackageJson(
  contract: PublicPackageContract,
): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(join(getPackageDir(contract), 'package.json'), 'utf8'),
  ) as Record<string, unknown>;
}

export function findLockstepVersionBumpErrors(
  states: readonly PublicPackageVersionState[],
): string[] {
  const changedPackages = states.filter((state) => state.changedSinceBase);
  if (changedPackages.length === 0) {
    return [];
  }

  const errors: string[] = [];
  const uniqueCurrentVersions = new Set(
    states
      .map((state) => state.currentVersion.trim())
      .filter((version) => version.length > 0),
  );

  if (uniqueCurrentVersions.size > 1) {
    errors.push(
      `public packages must stay on the same version for lockstep release publishes. Found: ${states
        .map((state) => `${state.contract.publicName}@${state.currentVersion}`)
        .join(', ')}`,
    );
  }

  const unchangedPackages = states.filter(
    (state) =>
      state.baseVersion !== null && state.currentVersion === state.baseVersion,
  );

  if (unchangedPackages.length > 0) {
    errors.push(
      `publishable package changes require a lockstep version bump across all public packages. Changed packages: ${changedPackages
        .map((state) => state.contract.publicName)
        .join(', ')}. Packages still at their base version: ${unchangedPackages
        .map((state) => `${state.contract.publicName}@${state.currentVersion}`)
        .join(', ')}`,
    );
  }

  return errors;
}

async function validateLockstepVersionBumps(
  contracts: readonly PublicPackageContract[],
): Promise<PackageValidationFailure | null> {
  const mergeBase = await resolveMergeBase();
  if (!mergeBase) {
    return null;
  }

  const changedWorkspaceDirs = await findChangedWorkspaceDirs(
    mergeBase,
    'HEAD',
    contracts,
  );
  if (changedWorkspaceDirs.size === 0) {
    return null;
  }

  const states = await Promise.all(
    contracts.map(async (contract) => {
      const currentPackageJson = await readPackageJson(contract);
      const basePackageJson = await readPackageJsonAtGitRef(
        mergeBase,
        contract.workspaceDir,
      );
      return {
        contract,
        changedSinceBase: changedWorkspaceDirs.has(contract.workspaceDir),
        currentVersion: getPackageVersion(currentPackageJson) ?? '',
        baseVersion: getPackageVersion(basePackageJson),
      } satisfies PublicPackageVersionState;
    }),
  );

  const errors = findLockstepVersionBumpErrors(states);
  return errors.length > 0 ? { contract: null, errors } : null;
}

async function packPackage(
  contract: PublicPackageContract,
): Promise<PackedArtifact> {
  const packDir = await mkdtemp(join(tmpdir(), 'oat-public-pack-'));

  try {
    await runCommand(
      'pnpm',
      ['--filter', contract.publicName, 'pack', '--pack-destination', packDir],
      REPO_ROOT,
    );

    const packedFiles = (await readdir(packDir)).filter((file) =>
      file.endsWith('.tgz'),
    );
    const tarballName = packedFiles[0];

    if (!tarballName) {
      throw new Error(
        `pnpm pack produced no tarball for ${contract.publicName}`,
      );
    }

    const tarballPath = join(packDir, tarballName);
    const tarList = await runCommand('tar', ['-tzf', tarballPath], REPO_ROOT);
    const packageJsonText = await runCommand(
      'tar',
      ['-xOf', tarballPath, 'package/package.json'],
      REPO_ROOT,
    );
    const packedPaths = tarList
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^package\//, ''))
      .filter((line) => line.length > 0);

    return {
      filename: tarballName,
      packageJson: JSON.parse(packageJsonText) as Record<string, unknown>,
      files: packedPaths.map((path) => ({ path })),
    };
  } finally {
    await rm(packDir, { recursive: true, force: true });
  }
}

async function buildPublicPackages(
  contracts: readonly PublicPackageContract[],
) {
  const buildFilters = contracts.flatMap((contract) => [
    '--filter',
    contract.publicName,
  ]);

  await runCommand(
    'pnpm',
    ['exec', 'turbo', 'run', 'build', ...buildFilters],
    REPO_ROOT,
  );
}

async function validatePackage(
  contract: PublicPackageContract,
): Promise<PackageValidationFailure | null> {
  const packageJson = await readPackageJson(contract);
  const missingMetadataFields = findMissingMetadataFields(
    packageJson,
    contract,
  );
  const missingBuildArtifacts = await findMissingBuildArtifacts(
    getPackageDir(contract),
    contract,
  );
  const packedArtifact = await packPackage(contract);
  const packedPackageJson = packedArtifact.packageJson;
  const missingPackedMetadataFields = findMissingMetadataFields(
    packedPackageJson,
    contract,
  );
  const workspaceProtocolSpecs =
    findWorkspaceProtocolDependencySpecs(packedPackageJson);
  const packedPaths = packedArtifact.files.map((file) => file.path);
  const missingPackedPaths = findMissingPackedPaths(packedPaths, contract);
  const forbiddenPackedPaths = findForbiddenPackedPaths(packedPaths, contract);
  const errors: string[] = [];

  if (packedPackageJson.name !== contract.publicName) {
    errors.push(
      `packed package.json name ${String(packedPackageJson.name)} does not match ${contract.publicName}`,
    );
  }

  if (missingMetadataFields.length > 0) {
    errors.push(`missing metadata fields: ${missingMetadataFields.join(', ')}`);
  }

  if (missingPackedMetadataFields.length > 0) {
    errors.push(
      `packed package.json is missing metadata fields: ${missingPackedMetadataFields.join(', ')}`,
    );
  }

  if (missingBuildArtifacts.length > 0) {
    errors.push(
      `missing build artifacts before pack: ${missingBuildArtifacts.join(', ')}`,
    );
  }

  if (missingPackedPaths.length > 0) {
    errors.push(`missing packed paths: ${missingPackedPaths.join(', ')}`);
  }

  if (forbiddenPackedPaths.length > 0) {
    errors.push(`forbidden packed paths: ${forbiddenPackedPaths.join(', ')}`);
  }

  if (workspaceProtocolSpecs.length > 0) {
    errors.push(
      `packed package.json still contains workspace protocol specs: ${workspaceProtocolSpecs.join(', ')}`,
    );
  }

  if (errors.length === 0) {
    console.log(
      `validated ${contract.publicName} (${packedArtifact.filename})`,
    );
    return null;
  }

  return { contract, errors };
}

export async function runReleaseValidation(): Promise<
  PackageValidationFailure[]
> {
  const contracts = getPublicPackageContracts();
  await buildPublicPackages(contracts);

  const failures: PackageValidationFailure[] = [];
  const versionFailure = await validateLockstepVersionBumps(contracts);
  if (versionFailure) {
    failures.push(versionFailure);
  }
  for (const contract of contracts) {
    const failure = await validatePackage(contract);
    if (failure) {
      failures.push(failure);
    }
  }

  return failures;
}

async function main() {
  try {
    const failures = await runReleaseValidation();

    if (failures.length === 0) {
      console.log(
        `release validation passed for ${getPublicPackageContracts().length} public packages`,
      );
      return;
    }

    for (const failure of failures) {
      console.error(
        failure.contract
          ? `validation failed for ${failure.contract.publicName}`
          : 'validation failed for release version policy',
      );
      for (const error of failure.errors) {
        console.error(`- ${error}`);
      }
    }

    process.exitCode = 1;
  } catch (error) {
    console.error('release validation failed to run');
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
