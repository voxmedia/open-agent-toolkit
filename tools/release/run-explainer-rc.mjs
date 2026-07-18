#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const RC_SCHEMA_VERSION = 'explainer-kit.release-candidate/v1';
const EXECUTION_SCHEMA_VERSION = 'explainer-kit.packaged-execution/v1';
const CLI_PACKAGE = '@open-agent-toolkit/cli';
const PACKAGE_NAMES = [
  '@open-agent-toolkit/cli',
  '@open-agent-toolkit/control-plane',
  '@open-agent-toolkit/docs-config',
  '@open-agent-toolkit/docs-theme',
  '@open-agent-toolkit/docs-transforms',
];
const SKILL_LAYOUTS = new Map([
  ['explainer-kit', 'package/assets/skills/explainer-kit'],
  ['oat-explainer-kit', 'package/assets/skills/oat-explainer-kit'],
]);
const ALLOWED_ENTRIES = new Set(['scripts/publish.mjs', 'scripts/run.mjs']);
const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;

class RcRunError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export async function runExplainerRc({
  rcManifest,
  entry,
  record,
  entryArgs = [],
  cwd = process.cwd(),
  env = process.env,
}) {
  const manifestPath = resolve(cwd, rcManifest);
  const recordPath = resolve(cwd, record);
  validateEntry(entry);
  const manifest = await loadManifest(manifestPath);
  const artifacts = await verifyArtifacts(manifest, manifestPath, cwd);
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
  validateManifest(manifest);
  const identity = {
    schemaVersion: manifest.schemaVersion,
    commit: manifest.commit,
    packages: manifest.packages,
    skills: manifest.skills,
    schemas: manifest.schemas,
    recipes: manifest.recipes,
    changedCandidates: manifest.changedCandidates,
  };
  if (hashBytes(Buffer.from(JSON.stringify(identity))) !== manifest.rcId) {
    throw new RcRunError(
      'E_RC_IDENTITY',
      'Release candidate identity does not match its manifest.',
    );
  }
  return manifest;
}

function validateManifest(manifest) {
  assertObject(manifest, 'release candidate');
  assertExactKeys(manifest, [
    'schemaVersion',
    'rcId',
    'commit',
    'packages',
    'skills',
    'schemas',
    'recipes',
    'changedCandidates',
  ]);
  if (manifest.schemaVersion !== RC_SCHEMA_VERSION) invalidManifest();
  requiredPattern(manifest.rcId, HASH_PATTERN);
  requiredPattern(manifest.commit, COMMIT_PATTERN);
  if (
    !Array.isArray(manifest.changedCandidates) ||
    manifest.changedCandidates.length !== 0
  ) {
    invalidManifest();
  }

  validatePackages(manifest.packages);
  validateSkills(manifest.skills);
  validateSchemas(manifest.schemas);
  validateRecipes(manifest.recipes);
}

function validatePackages(packages) {
  if (!Array.isArray(packages) || packages.length !== PACKAGE_NAMES.length) {
    invalidManifest();
  }
  packages.forEach((pkg) => {
    assertObject(pkg, 'package');
    assertExactKeys(pkg, ['name', 'version', 'artifact', 'sha256']);
    requiredString(pkg.name);
    requiredString(pkg.version);
    requiredPattern(pkg.sha256, HASH_PATTERN);
    if (
      typeof pkg.artifact !== 'string' ||
      !pkg.artifact.endsWith('.tgz') ||
      pkg.artifact !== basename(pkg.artifact) ||
      pkg.artifact.includes('\\')
    ) {
      invalidManifest();
    }
  });
  if (
    JSON.stringify(packages.map(({ name }) => name)) !==
    JSON.stringify(PACKAGE_NAMES)
  ) {
    invalidManifest();
  }
  if (
    new Set(packages.map(({ artifact }) => artifact)).size !== packages.length
  ) {
    invalidManifest();
  }
}

function validateSkills(skills) {
  if (!Array.isArray(skills) || skills.length !== SKILL_LAYOUTS.size) {
    invalidManifest();
  }
  skills.forEach((skill) => {
    assertObject(skill, 'skill');
    assertExactKeys(skill, ['name', 'version', 'package', 'path', 'sha256']);
    requiredString(skill.name);
    requiredString(skill.version);
    requiredPattern(skill.sha256, HASH_PATTERN);
    if (
      skill.package !== CLI_PACKAGE ||
      SKILL_LAYOUTS.get(skill.name) !== skill.path
    ) {
      invalidManifest();
    }
  });
  if (
    JSON.stringify(skills.map(({ name }) => name)) !==
    JSON.stringify([...SKILL_LAYOUTS.keys()])
  ) {
    invalidManifest();
  }
}

function validateSchemas(schemas) {
  if (!Array.isArray(schemas) || schemas.length === 0) invalidManifest();
  schemas.forEach((schema) => {
    assertObject(schema, 'schema');
    assertExactKeys(schema, ['id', 'path', 'sha256']);
    requiredString(schema.id);
    requiredRelativePath(schema.path);
    requiredPattern(schema.sha256, HASH_PATTERN);
  });
  assertUnique(schemas.map(({ id }) => id));
  assertSorted(schemas.map(({ id }) => id));
}

function validateRecipes(recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) invalidManifest();
  recipes.forEach((recipe) => {
    assertObject(recipe, 'recipe');
    assertExactKeys(recipe, [
      'id',
      'version',
      'schemaVersion',
      'path',
      'sha256',
    ]);
    requiredString(recipe.id);
    requiredString(recipe.version);
    requiredString(recipe.schemaVersion);
    requiredRelativePath(recipe.path);
    requiredPattern(recipe.sha256, HASH_PATTERN);
  });
  assertUnique(recipes.map(({ id }) => id));
  assertSorted(recipes.map(({ id }) => id));
}

async function verifyArtifacts(manifest, manifestPath, cwd) {
  const roots = [
    dirname(manifestPath),
    resolve(cwd, 'dist/explainer-kit-rc'),
  ].filter((root, index, values) => values.indexOf(root) === index);
  const verified = new Map();

  for (const pkg of manifest.packages) {
    const path = await findArtifact(pkg.artifact, roots);
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

async function findArtifact(artifact, roots) {
  for (const root of roots) {
    const candidate = join(root, artifact);
    try {
      const stats = await lstat(candidate);
      if (stats.isFile()) return candidate;
      throw new RcRunError(
        'E_ARTIFACT_TYPE',
        'A retained release candidate artifact is not a regular file.',
        { artifact },
      );
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
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

function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
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

function assertObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    invalidManifest();
  }
}

function assertExactKeys(value, expected) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) invalidManifest();
}

function assertUnique(values) {
  if (new Set(values).size !== values.length) invalidManifest();
}

function assertSorted(values) {
  const sorted = [...values].sort();
  if (JSON.stringify(values) !== JSON.stringify(sorted)) invalidManifest();
}

function requiredString(value) {
  if (typeof value !== 'string' || value.length === 0) invalidManifest();
}

function requiredPattern(value, pattern) {
  if (typeof value !== 'string' || !pattern.test(value)) invalidManifest();
}

function requiredRelativePath(value) {
  requiredString(value);
  if (
    isAbsolute(value) ||
    value.includes('\\') ||
    value
      .split('/')
      .some((part) => part === '' || part === '.' || part === '..')
  ) {
    invalidManifest();
  }
}

function invalidManifest() {
  throw new RcRunError(
    'E_RC_MANIFEST',
    'Release candidate manifest does not match the closed v1 schema.',
  );
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
      argument !== '--entry' &&
      argument !== '--record'
    ) {
      throw new RcRunError('E_USAGE', 'Unknown runner argument.');
    }
    const value = runnerArgs[index + 1];
    if (!value || value === '--') {
      throw new RcRunError('E_USAGE', 'A required runner value is missing.');
    }
    const key = argument === '--rc-manifest' ? 'rcManifest' : argument.slice(2);
    if (options[key] !== undefined) {
      throw new RcRunError('E_USAGE', 'Runner arguments may be supplied once.');
    }
    options[key] = value;
    index += 1;
  }
  if (!options.rcManifest || !options.entry || !options.record) {
    throw new RcRunError(
      'E_USAGE',
      'Usage: run-explainer-rc.mjs --rc-manifest <json> --entry <path> --record <json> -- <entry args>',
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
