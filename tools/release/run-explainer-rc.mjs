#!/usr/bin/env node

import { execFile } from 'node:child_process';
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
  CLI_PACKAGE,
  EXECUTION_SCHEMA_VERSION,
  assertReleaseCandidate,
  hashBytes,
  hashCanonicalJson,
} from './explainer-rc-contract.mjs';

const execFileAsync = promisify(execFile);
const SKILL_LAYOUTS = new Map([
  ['explainer-kit', 'package/assets/skills/explainer-kit'],
  ['oat-explainer-kit', 'package/assets/skills/oat-explainer-kit'],
]);
const ALLOWED_ENTRIES = new Set(['scripts/publish.mjs', 'scripts/run.mjs']);

class RcRunError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function runExplainerRc({
  rcManifest,
  artifactsDir,
  entry,
  record,
  receipt,
  entryArgs = [],
  cwd = process.cwd(),
  env = process.env,
}) {
  const manifestPath = resolve(cwd, rcManifest);
  const artifactsRoot = await resolveArtifactsDirectory(cwd, artifactsDir);
  const recordPath = resolve(cwd, record);
  validateEntry(entry);
  if (entry === 'scripts/publish.mjs' && receipt) {
    throw new RcRunError(
      'E_USAGE',
      'Top-level --receipt is only valid for packaged core runs.',
    );
  }
  const manifest = await loadManifest(manifestPath);
  const artifacts = await verifyArtifacts(manifest, artifactsRoot);
  const request = await readRequestBinding(entry, entryArgs, cwd);
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'explainer-rc-run-'));

  try {
    const cliPackage = manifest.packages.find(
      ({ name }) => name === CLI_PACKAGE,
    );
    const cliArtifact = artifacts.get(CLI_PACKAGE);
    await extractTarball(cliArtifact.path, temporaryRoot, cwd, env);
    const packagedEntry = await resolvePackagedEntry(temporaryRoot, entry);
    await validatePackageLayout(temporaryRoot, manifest, cliPackage);
    const exit = await executeEntry(packagedEntry, entryArgs, cwd, env);
    const bindings =
      exit.code === 0 && exit.signal === null
        ? await readOutputBindings({
            entry,
            entryArgs,
            exit,
            request,
            declaredReceipt: receipt,
            cwd,
          })
        : {
            request: request.binding,
            outputs: { manifest: null, receipt: null },
            coreRunId: null,
          };
    const executionRecord = {
      schemaVersion: EXECUTION_SCHEMA_VERSION,
      rcId: manifest.rcId,
      entry,
      package: {
        name: cliPackage.name,
        version: cliPackage.version,
        artifact: cliPackage.artifact,
        sha256: cliPackage.sha256,
      },
      verifiedTarballs: manifest.packages.map(({ name, artifact, sha256 }) => ({
        name,
        artifact,
        sha256,
      })),
      ...bindings,
      exit: { code: exit.code, signal: exit.signal },
    };
    await writeJsonAtomic(recordPath, executionRecord);
    if (exit.code !== 0 || exit.signal !== null) {
      throw new RcRunError(
        'E_ENTRY_EXIT',
        'Packaged entry exited unsuccessfully.',
        { exit: executionRecord.exit },
      );
    }
    if (exit.stdout) process.stdout.write(exit.stdout);
    if (exit.stderr) process.stderr.write(exit.stderr);
    return executionRecord;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function loadManifest(path) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new RcRunError(
      'E_RC_MANIFEST',
      'Release candidate manifest is missing or malformed.',
    );
  }
  assertReleaseCandidate(manifest, (message, identityMismatch = false) => {
    throw new RcRunError(
      identityMismatch ? 'E_RC_IDENTITY' : 'E_RC_MANIFEST',
      identityMismatch
        ? 'Release candidate identity does not match its manifest.'
        : message,
    );
  });
  return manifest;
}

async function verifyArtifacts(manifest, artifactsRoot) {
  const verified = new Map();

  for (const pkg of manifest.packages) {
    const path = await findArtifact(pkg.artifact, artifactsRoot);
    const actual = await hashFile(path);
    if (actual !== pkg.sha256) {
      throw new RcRunError(
        'E_HASH_MISMATCH',
        'A retained release candidate artifact failed verification.',
        { artifact: pkg.artifact },
      );
    }
    verified.set(pkg.name, { path, sha256: actual });
  }
  return verified;
}

async function findArtifact(artifact, root) {
  const candidate = join(root, artifact);
  try {
    const stats = await lstat(candidate);
    if (stats.isFile() && !stats.isSymbolicLink()) return candidate;
    throw new RcRunError(
      'E_ARTIFACT_TYPE',
      'A retained release candidate artifact is not a regular file.',
      { artifact },
    );
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  throw new RcRunError(
    'E_ARTIFACT_MISSING',
    'A retained release candidate artifact is missing.',
    { artifact },
  );
}

async function extractTarball(artifact, destination, cwd, env) {
  try {
    await execFileAsync(
      'tar',
      ['-xzf', artifact, '-C', destination, '--no-same-owner'],
      {
        cwd,
        env,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
  } catch {
    throw new RcRunError(
      'E_EXTRACT',
      'The verified release candidate package could not be extracted.',
    );
  }
}

async function validatePackageLayout(root, manifest, cliPackage) {
  const packageRoot = join(root, 'package');
  const resolvedExtractionRoot = await realpath(root);
  const resolvedPackageRoot = await requiredRealpath(
    packageRoot,
    'E_PACKAGE_LAYOUT',
    'The extracted package root is missing.',
  );
  assertContained(
    resolvedExtractionRoot,
    resolvedPackageRoot,
    'E_PACKAGE_LAYOUT',
  );
  const packageJson = await readRequiredJson(
    join(resolvedPackageRoot, 'package.json'),
    'E_PACKAGE_LAYOUT',
  );
  if (
    packageJson.name !== cliPackage.name ||
    packageJson.version !== cliPackage.version
  ) {
    throw new RcRunError(
      'E_PACKAGE_LAYOUT',
      'Extracted package metadata does not match the release candidate.',
    );
  }

  for (const skill of manifest.skills) {
    const skillRoot = join(root, ...skill.path.split('/'));
    const resolvedSkillRoot = await requiredRealpath(
      skillRoot,
      'E_PACKAGE_LAYOUT',
      'A declared packaged skill is missing.',
    );
    assertContained(resolvedPackageRoot, resolvedSkillRoot, 'E_PACKAGE_LAYOUT');
    const actual = await hashTree(resolvedSkillRoot);
    if (actual !== skill.sha256) {
      throw new RcRunError(
        'E_SKILL_HASH_MISMATCH',
        'A packaged skill failed release candidate verification.',
      );
    }
  }
}

async function resolvePackagedEntry(root, entry) {
  const resolvedExtractionRoot = await realpath(root);
  const skillRoot = join(root, SKILL_LAYOUTS.get('explainer-kit'));
  const resolvedRoot = await requiredRealpath(
    skillRoot,
    'E_PACKAGE_LAYOUT',
    'The packaged explainer skill is missing.',
  );
  assertContained(resolvedExtractionRoot, resolvedRoot, 'E_ENTRY_ESCAPE');
  const candidate = join(resolvedRoot, ...entry.split('/'));
  let resolvedEntry;
  try {
    resolvedEntry = await realpath(candidate);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new RcRunError(
        'E_ENTRY_MISSING',
        'The declared entry is absent from the verified package.',
      );
    }
    throw new RcRunError(
      'E_ENTRY_PATH',
      'The packaged entry could not be resolved safely.',
    );
  }
  assertContained(resolvedRoot, resolvedEntry, 'E_ENTRY_ESCAPE');
  const stats = await lstat(resolvedEntry);
  if (!stats.isFile()) {
    throw new RcRunError(
      'E_ENTRY_TYPE',
      'The packaged entry is not a regular file.',
    );
  }
  return resolvedEntry;
}

async function executeEntry(entry, args, cwd, env) {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [entry, ...args],
      {
        cwd,
        env,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      },
    );
    return { code: 0, signal: null, stdout, stderr };
  } catch (error) {
    if (typeof error.code === 'number' || error.signal) {
      return {
        code: typeof error.code === 'number' ? error.code : null,
        signal: typeof error.signal === 'string' ? error.signal : null,
        stdout: '',
        stderr: '',
      };
    }
    throw new RcRunError(
      'E_ENTRY_EXEC',
      'The packaged entry could not be executed.',
    );
  }
}

async function resolveArtifactsDirectory(cwd, artifactsDir) {
  if (typeof artifactsDir !== 'string' || artifactsDir.length === 0) {
    throw new RcRunError('E_USAGE', 'An explicit --artifacts-dir is required.');
  }
  const candidate = resolve(cwd, artifactsDir);
  try {
    const stats = await lstat(candidate);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('invalid artifacts directory');
    }
    return await realpath(candidate);
  } catch {
    throw new RcRunError(
      'E_ARTIFACTS_DIR',
      'The explicit retained artifacts directory is unavailable or unsafe.',
    );
  }
}

async function readRequestBinding(entry, entryArgs, cwd) {
  const requestArgument = requiredEntryOption(entryArgs, '--request');
  const path = resolve(cwd, requestArgument);
  let value;
  try {
    value = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new RcRunError(
      'E_EXECUTION_BINDING',
      'The packaged request could not be read for provenance binding.',
    );
  }
  const expectedSchema =
    entry === 'scripts/publish.mjs'
      ? 'explainer-kit.publish-request/v1'
      : 'explainer-kit.run-request/v1';
  if (value?.schemaVersion !== expectedSchema) {
    throw new RcRunError(
      'E_EXECUTION_BINDING',
      'The packaged request schema does not match the selected entry.',
    );
  }
  return {
    value,
    binding: {
      schemaVersion: value.schemaVersion,
      sha256: hashCanonicalJson(value),
    },
  };
}

async function readOutputBindings({
  entry,
  entryArgs,
  exit,
  request,
  declaredReceipt,
  cwd,
}) {
  let manifestPath;
  let receiptPath;
  let reportedRunId;
  if (entry === 'scripts/publish.mjs') {
    manifestPath = resolve(cwd, request.value.manifestPath);
    receiptPath = resolve(cwd, requiredEntryOption(entryArgs, '--receipt'));
  } else {
    const result = parseEntryResult(exit.stdout);
    if (typeof result.manifestPath !== 'string') {
      throw new RcRunError(
        'E_EXECUTION_BINDING',
        'The packaged core did not declare its manifest output.',
      );
    }
    manifestPath = resolve(cwd, result.manifestPath);
    receiptPath =
      declaredReceipt !== undefined
        ? resolve(cwd, declaredReceipt)
        : typeof result.publishReceiptPath === 'string'
          ? resolve(cwd, result.publishReceiptPath)
          : undefined;
    reportedRunId = result.runId;
  }

  const manifest = await readBoundJson(
    manifestPath,
    'explainer-kit.manifest/v1',
    'manifest',
  );
  if (
    typeof manifest.runId !== 'string' ||
    manifest.runId.length === 0 ||
    (reportedRunId !== undefined && reportedRunId !== manifest.runId)
  ) {
    throw new RcRunError(
      'E_EXECUTION_BINDING',
      'The packaged manifest does not match the reported core run.',
    );
  }
  const receipt = receiptPath
    ? await readBoundJson(
        receiptPath,
        'explainer-kit.publish-receipt/v1',
        'receipt',
      )
    : null;
  return {
    request: request.binding,
    outputs: {
      manifest: {
        schemaVersion: manifest.schemaVersion,
        sha256: hashCanonicalJson(manifest),
      },
      receipt: receipt
        ? {
            schemaVersion: receipt.schemaVersion,
            sha256: hashCanonicalJson(receipt),
          }
        : null,
    },
    coreRunId: manifest.runId,
  };
}

async function readBoundJson(path, schemaVersion, label) {
  try {
    const value = JSON.parse(await readFile(path, 'utf8'));
    if (value?.schemaVersion !== schemaVersion) throw new Error();
    return value;
  } catch {
    throw new RcRunError(
      'E_EXECUTION_BINDING',
      `The packaged ${label} output could not be bound.`,
    );
  }
}

function parseEntryResult(stdout) {
  for (const line of String(stdout).trim().split('\n').reverse()) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === 'object') return value;
    } catch {
      // Structured output may follow non-JSON progress lines.
    }
  }
  throw new RcRunError(
    'E_EXECUTION_BINDING',
    'The packaged entry did not emit a structured result.',
  );
}

function requiredEntryOption(args, option) {
  const indexes = args
    .map((value, index) => (value === option ? index : -1))
    .filter((index) => index >= 0);
  if (
    indexes.length !== 1 ||
    !args[indexes[0] + 1] ||
    args[indexes[0] + 1].startsWith('--')
  ) {
    throw new RcRunError(
      'E_EXECUTION_BINDING',
      `Packaged entry requires exactly one ${option} value.`,
    );
  }
  return args[indexes[0] + 1];
}

function validateEntry(entry) {
  if (
    typeof entry !== 'string' ||
    isAbsolute(entry) ||
    entry.includes('\\') ||
    entry
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new RcRunError(
      'E_ENTRY_PATH',
      'Entry must be a normalized relative packaged path.',
    );
  }
  if (!ALLOWED_ENTRIES.has(entry)) {
    throw new RcRunError(
      'E_ENTRY_UNDECLARED',
      'Entry is not an allowed packaged connector.',
    );
  }
}

async function hashTree(root) {
  const files = await walkFiles(root);
  const entries = await Promise.all(
    files.map(async (path) => ({
      path: relative(root, path).replaceAll('\\', '/'),
      sha256: await hashFile(path),
    })),
  );
  return hashBytes(Buffer.from(JSON.stringify(entries)));
}

async function walkFiles(root) {
  const files = [];
  const entries = (await readdir(root, { withFileTypes: true })).sort(
    (left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(root, entry.name);
    const stats = await lstat(path);
    if (stats.isDirectory()) {
      files.push(...(await walkFiles(path)));
    } else if (stats.isFile()) {
      files.push(path);
    } else {
      throw new RcRunError(
        'E_PACKAGE_LAYOUT',
        'Packaged skills may contain only files and directories.',
      );
    }
  }
  return files;
}

async function hashFile(path) {
  return hashBytes(await readFile(path));
}

async function readRequiredJson(path, code) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    throw new RcRunError(
      code,
      'Required packaged metadata is missing or malformed.',
    );
  }
}

async function requiredRealpath(path, code, message) {
  try {
    return await realpath(path);
  } catch {
    throw new RcRunError(code, message);
  }
}

function assertContained(root, candidate, code) {
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    throw new RcRunError(code, 'Packaged path escapes its declared root.');
  }
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporaryPath, path);
  } catch {
    await rm(temporaryPath, { force: true });
    throw new RcRunError(
      'E_RECORD',
      'Packaged execution record could not be written.',
    );
  }
}

function parseArguments(argv) {
  const separator = argv.indexOf('--');
  const runnerArgs = separator === -1 ? argv : argv.slice(0, separator);
  const entryArgs = separator === -1 ? [] : argv.slice(separator + 1);
  const options = {};
  for (let index = 0; index < runnerArgs.length; index += 1) {
    const argument = runnerArgs[index];
    if (
      argument !== '--rc-manifest' &&
      argument !== '--artifacts-dir' &&
      argument !== '--entry' &&
      argument !== '--record' &&
      argument !== '--receipt'
    ) {
      throw new RcRunError('E_USAGE', 'Unknown runner argument.');
    }
    const value = runnerArgs[index + 1];
    if (!value || value === '--') {
      throw new RcRunError('E_USAGE', 'A required runner value is missing.');
    }
    const key =
      argument === '--rc-manifest'
        ? 'rcManifest'
        : argument === '--artifacts-dir'
          ? 'artifactsDir'
          : argument.slice(2);
    if (options[key] !== undefined) {
      throw new RcRunError('E_USAGE', 'Runner arguments may be supplied once.');
    }
    options[key] = value;
    index += 1;
  }
  if (
    !options.rcManifest ||
    !options.artifactsDir ||
    !options.entry ||
    !options.record
  ) {
    throw new RcRunError(
      'E_USAGE',
      'Usage: run-explainer-rc.mjs --rc-manifest <json> --artifacts-dir <dir> --entry <path> --record <json> [--receipt <json>] -- <entry args>',
    );
  }
  return { ...options, entryArgs };
}

function publicFailure(error) {
  if (!(error instanceof RcRunError)) {
    return {
      code: 'E_RC_RUN',
      message: 'Packaged release candidate execution failed.',
    };
  }
  return {
    code: error.code,
    message: error.message,
    ...(error.details ?? {}),
  };
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    await runExplainerRc(options);
  } catch (error) {
    process.stderr.write(`${JSON.stringify(publicFailure(error))}\n`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
