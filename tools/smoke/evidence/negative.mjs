import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { emitEvidenceReport } from './report.mjs';

const execFileAsync = promisify(execFile);

export class NegativeEvidenceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NegativeEvidenceError';
  }
}

function parsePreflightOutput(contents) {
  for (const line of contents.trim().split(/\r?\n/u).reverse()) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object') {
        return value;
      }
    } catch {
      // Continue to the next earlier line.
    }
  }
  throw new NegativeEvidenceError(
    'Preflight capture does not contain a JSON report.',
  );
}

async function listManifestPaths(runsDirectory) {
  let entries;
  try {
    entries = await readdir(runsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      join(runsDirectory, entry.name, 'provisioning-manifest.json'),
    )
    .sort();
}

async function gitLines(repository, args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repository,
    encoding: 'utf8',
  });
  return stdout.split(/\r?\n/u).filter(Boolean);
}

export async function buildUnavailableControl({
  harness,
  preflightPath,
  repository,
  runsDirectory,
}) {
  const preflight = parsePreflightOutput(await readFile(preflightPath, 'utf8'));
  const [branches, worktreeLines, manifests] = await Promise.all([
    gitLines(repository, [
      'for-each-ref',
      '--format=%(refname:short)',
      'refs/heads/smoke-*',
    ]),
    gitLines(repository, ['worktree', 'list', '--porcelain']),
    listManifestPaths(runsDirectory),
  ]);
  const worktrees = worktreeLines
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length))
    .filter((path) => path.startsWith(`${resolve(runsDirectory)}/`))
    .sort();

  return {
    control: { harness, kind: 'unavailable-target' },
    kind: 'control',
    preflight,
    provisioningEvidence: { branches, manifests, worktrees },
    scenario: 'plan-review',
    schemaVersion: 1,
  };
}

export async function emitUnavailableControl(options) {
  const bundle = await buildUnavailableControl(options);
  await mkdir(options.outDirectory, { recursive: true });
  const bundlePath = join(options.outDirectory, 'bundle.json');
  await writeFile(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
  return emitEvidenceReport({
    bundlePath,
    outDirectory: options.outDirectory,
  });
}

function parseArgs(argv) {
  const values = {};
  const options = [
    '--harness',
    '--preflight',
    '--repository',
    '--runs-dir',
    '--out',
  ];
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (!options.includes(option)) {
      throw new NegativeEvidenceError(`Unknown argument: ${option}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--') || values[option]) {
      throw new NegativeEvidenceError(`Invalid value for ${option}.`);
    }
    values[option] = value;
    index += 1;
  }
  if (options.some((option) => !values[option])) {
    throw new NegativeEvidenceError(
      'Unavailable control requires --harness, --preflight, --repository, --runs-dir, and --out.',
    );
  }
  return {
    harness: values['--harness'],
    outDirectory: resolve(values['--out']),
    preflightPath: resolve(values['--preflight']),
    repository: resolve(values['--repository']),
    runsDirectory: resolve(values['--runs-dir']),
  };
}

async function main() {
  const result = await emitUnavailableControl(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${result.jsonPath}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
