import { execFile } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  findForbiddenPackedPaths,
  findMissingMetadataFields,
  findMissingPackedPaths,
  getPublicPackageContracts,
  type PublicPackageContract,
} from '../../packages/cli/src/release/public-package-contract';

const execFileAsync = promisify(execFile);
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

interface PackedFileEntry {
  path: string;
}

interface NpmPackDryRunResult {
  name: string;
  filename: string;
  files: PackedFileEntry[];
}

interface PackageValidationFailure {
  contract: PublicPackageContract;
  errors: string[];
}

function getPackageDir(contract: PublicPackageContract): string {
  return join(REPO_ROOT, contract.workspaceDir);
}

async function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const { stdout } = await execFileAsync(command, args, {
    cwd,
    env: process.env,
    maxBuffer: 20 * 1024 * 1024,
  });

  return stdout;
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

async function packPackage(
  contract: PublicPackageContract,
): Promise<NpmPackDryRunResult> {
  const stdout = await runCommand(
    'npm',
    ['pack', '--dry-run', '--json'],
    getPackageDir(contract),
  );
  const packResults = JSON.parse(stdout) as NpmPackDryRunResult[];
  const packResult = packResults[0];

  if (!packResult) {
    throw new Error(`npm pack returned no result for ${contract.publicName}`);
  }

  return packResult;
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
  const packResult = await packPackage(contract);
  const packedPaths = packResult.files.map((file) => file.path);
  const missingPackedPaths = findMissingPackedPaths(packedPaths, contract);
  const forbiddenPackedPaths = findForbiddenPackedPaths(packedPaths, contract);
  const errors: string[] = [];

  if (packResult.name !== contract.publicName) {
    errors.push(
      `npm pack reported package name ${packResult.name} instead of ${contract.publicName}`,
    );
  }

  if (missingMetadataFields.length > 0) {
    errors.push(`missing metadata fields: ${missingMetadataFields.join(', ')}`);
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

  if (errors.length === 0) {
    console.log(`validated ${contract.publicName} (${packResult.filename})`);
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
      console.error(`validation failed for ${failure.contract.publicName}`);
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
