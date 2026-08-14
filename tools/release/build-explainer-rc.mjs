#!/usr/bin/env node

import { execFile } from 'node:child_process';
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
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
  join,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { releaseCandidatePathspecGroups } from '../../packages/cli/scripts/bundle-inputs.mjs';
import {
  RC_SCHEMA_VERSION,
  SKILL_NAMES,
  hashBytes,
  hashCanonicalJson,
} from './explainer-rc-contract.mjs';

const execFileAsync = promisify(execFile);
const PACKAGE_DIRECTORIES = new Map([
  ['@open-agent-toolkit/cli', 'packages/cli'],
  ['@open-agent-toolkit/control-plane', 'packages/control-plane'],
  ['@open-agent-toolkit/docs-config', 'packages/docs-config'],
  ['@open-agent-toolkit/docs-theme', 'packages/docs-theme'],
  ['@open-agent-toolkit/docs-transforms', 'packages/docs-transforms'],
]);
const RC_OWNER_MARKER = '.explainer-kit-rc-owned.json';
const RC_OWNER = Object.freeze({
  schemaVersion: 'explainer-kit.rc-output-owner/v1',
});

class RcBuildError extends Error {
  constructor(code, message, changedCandidates = undefined) {
    super(message);
    this.code = code;
    this.changedCandidates = changedCandidates;
  }
}

export async function buildExplainerRc({
  repoRoot = process.cwd(),
  output,
  record,
}) {
  const root = resolve(repoRoot);
  const outputRoot = resolve(root, output);
  const recordPath = resolve(root, record);
  await validateRcOutputPath(root, outputRoot, recordPath);
  const changedCandidates = await listChangedCandidates(root);
  if (changedCandidates.length > 0) {
    throw new RcBuildError(
      'E_CHANGED_CANDIDATES',
      'Release candidate inputs must be committed before building.',
      changedCandidates,
    );
  }

  const commit = (await run('git', ['rev-parse', 'HEAD'], root)).trim();
  const beforeHashes = await snapshotTrackedCandidates(root);
  const assetsRoot = join(root, 'packages/cli/assets');
  const assetsBackup = await backupDirectory(assetsRoot);
  try {
    await run('pnpm', ['build'], root);

    const stagingRoot = await createStagingDirectory(outputRoot);
    try {
      const packages = [];
      for (const name of sorted(PACKAGE_DIRECTORIES.keys())) {
        const workspaceDirectory = PACKAGE_DIRECTORIES.get(name);
        const packageJson = await readJson(
          join(root, workspaceDirectory, 'package.json'),
        );
        const before = new Set(await readdir(stagingRoot));
        await run(
          'pnpm',
          ['--filter', name, 'pack', '--pack-destination', stagingRoot],
          root,
        );
        const artifacts = (await readdir(stagingRoot)).filter(
          (filename) => filename.endsWith('.tgz') && !before.has(filename),
        );
        if (artifacts.length !== 1) {
          throw new RcBuildError(
            'E_PACK_OUTPUT',
            `Expected one retained tarball for ${name}; found ${artifacts.length}.`,
          );
        }
        const artifact = artifacts[0];
        packages.push({
          name,
          version: requiredString(packageJson.version, `${name} version`),
          artifact,
          sha256: await hashFile(join(stagingRoot, artifact)),
        });
      }

      const afterHashes = await snapshotTrackedCandidates(root);
      const changedDuringBuild = sorted(
        new Set([
          ...findHashChanges(beforeHashes, afterHashes),
          ...(await listChangedCandidates(root)),
        ]),
      );
      if (changedDuringBuild.length > 0) {
        throw new RcBuildError(
          'E_CANDIDATE_HASH_CHANGED',
          'Release candidate inputs changed while the candidate was built.',
          changedDuringBuild,
        );
      }

      const bundledSkillsRoot = join(root, 'packages/cli/assets/skills');
      const skills = [];
      for (const name of SKILL_NAMES) {
        const skillRoot = join(bundledSkillsRoot, name);
        skills.push({
          name,
          version: parseSkillVersion(
            await readFile(join(skillRoot, 'SKILL.md'), 'utf8'),
            name,
          ),
          package: '@open-agent-toolkit/cli',
          path: `package/assets/skills/${name}`,
          sha256: await hashTree(skillRoot),
        });
      }

      const coreRoot = join(bundledSkillsRoot, 'explainer-kit');
      const schemas = await loadSchemas(coreRoot);
      const recipes = await loadRecipes(coreRoot);
      const identity = {
        schemaVersion: RC_SCHEMA_VERSION,
        commit,
        packages,
        skills: skills.sort(byName),
        schemas,
        recipes,
        changedCandidates: [],
      };
      const rcId = hashCanonicalJson(identity);
      const rcRecord = {
        schemaVersion: identity.schemaVersion,
        rcId,
        commit,
        packages: identity.packages,
        skills: identity.skills,
        schemas,
        recipes,
        changedCandidates: [],
      };

      await writeFile(
        join(stagingRoot, RC_OWNER_MARKER),
        `${JSON.stringify(RC_OWNER, null, 2)}\n`,
      );
      await replaceOwnedOutput(stagingRoot, outputRoot);
      await writeJsonAtomic(recordPath, rcRecord);
      return rcRecord;
    } catch (error) {
      await rm(stagingRoot, { recursive: true, force: true });
      throw error;
    }
  } finally {
    await restoreDirectory(assetsRoot, assetsBackup);
  }
}

async function loadSchemas(coreRoot) {
  const schemasRoot = join(coreRoot, 'schemas');
  const entries = [];
  for (const filename of sorted(await readdir(schemasRoot))) {
    if (!filename.endsWith('.json')) continue;
    const path = join(schemasRoot, filename);
    const schema = await readJson(path);
    entries.push({
      id: requiredString(schema.$id, `${filename} $id`),
      path: `schemas/${filename}`,
      sha256: await hashFile(path),
    });
  }
  return entries.sort(byId);
}

async function loadRecipes(coreRoot) {
  const recipesRoot = join(coreRoot, 'recipes');
  const entries = [];
  for (const filename of sorted(await readdir(recipesRoot))) {
    if (!filename.endsWith('.json')) continue;
    const path = join(recipesRoot, filename);
    const recipe = await readJson(path);
    entries.push({
      id: requiredString(recipe.id, `${filename} id`),
      version: requiredString(recipe.version, `${filename} version`),
      schemaVersion: requiredString(
        recipe.schemaVersion,
        `${filename} schemaVersion`,
      ),
      path: `recipes/${filename}`,
      sha256: await hashFile(path),
    });
  }
  return entries.sort(byRecipeIdentity);
}

async function listChangedCandidates(repoRoot) {
  const paths = [];
  for (const pathspecs of releaseCandidatePathspecGroups()) {
    const output = await run(
      'git',
      [
        'status',
        '--porcelain=v1',
        '-z',
        '--untracked-files=all',
        '--',
        ...pathspecs,
      ],
      repoRoot,
    );
    const tokens = output.split('\0').filter(Boolean);
    for (let index = 0; index < tokens.length; index += 1) {
      const entry = tokens[index];
      const status = entry.slice(0, 2);
      let path = entry.slice(3);
      if (/[RC]/.test(status) && tokens[index + 1]) {
        path = tokens[index + 1];
        index += 1;
      }
      paths.push(path);
    }
  }
  return sorted(new Set(paths));
}

async function snapshotTrackedCandidates(repoRoot) {
  const paths = new Set();
  for (const pathspecs of releaseCandidatePathspecGroups()) {
    const output = await run(
      'git',
      ['ls-files', '-z', '--', ...pathspecs],
      repoRoot,
    );
    output
      .split('\0')
      .filter(Boolean)
      .forEach((path) => paths.add(path));
  }
  const canonicalRoot = await realpath(repoRoot);
  const entries = await Promise.all(
    sorted(paths).map(async (path) => [
      path,
      await hashCandidateInput({
        repoRoot,
        canonicalRoot,
        path,
        declaredPaths: paths,
      }),
    ]),
  );
  return new Map(entries);
}

async function hashCandidateInput({
  repoRoot,
  canonicalRoot,
  path,
  declaredPaths,
}) {
  const absolutePath = join(repoRoot, path);
  const stats = await lstat(absolutePath);
  if (stats.isFile()) return hashFile(absolutePath);
  if (!stats.isSymbolicLink()) {
    throw candidateSymlinkError(
      'Release candidate inputs must be regular files or safe symlinks.',
    );
  }

  const link = await readlink(absolutePath);
  await validateCandidateSymlink({
    repoRoot,
    canonicalRoot,
    linkPath: absolutePath,
    link,
    declaredPaths,
    visitedDirectories: new Set(),
  });
  return hashBytes(Buffer.from(`symlink\0${link}`));
}

async function validateCandidateSymlink({
  repoRoot,
  canonicalRoot,
  linkPath,
  link,
  declaredPaths,
  visitedDirectories,
}) {
  const lexicalTarget = resolve(dirname(linkPath), link);
  if (!isContained(resolve(repoRoot), lexicalTarget)) {
    throw candidateSymlinkError(
      'Release candidate symlinks must not target outside the repository.',
    );
  }

  let lexicalStats;
  try {
    await rejectSymlinkAncestors(resolve(repoRoot), lexicalTarget);
    lexicalStats = await lstat(lexicalTarget);
  } catch {
    throw candidateSymlinkError(
      'Release candidate symlinks must resolve to an existing declared input.',
    );
  }
  if (lexicalStats.isSymbolicLink()) {
    throw candidateSymlinkError(
      'Release candidate symlinks must not resolve through another symlink.',
    );
  }

  let target;
  try {
    target = await realpath(lexicalTarget);
  } catch {
    throw candidateSymlinkError(
      'Release candidate symlinks must resolve to an existing declared input.',
    );
  }
  if (!isContained(canonicalRoot, target)) {
    throw candidateSymlinkError(
      'Release candidate symlinks must not resolve outside the repository.',
    );
  }

  const stats = await lstat(target);
  if (stats.isFile()) {
    requireDeclaredTarget(canonicalRoot, target, declaredPaths);
    return;
  }
  if (stats.isDirectory()) {
    await validateDeclaredDirectory({
      repoRoot,
      canonicalRoot,
      directory: target,
      declaredPaths,
      visitedDirectories,
    });
    return;
  }
  throw candidateSymlinkError(
    'Release candidate symlink targets must be files or directories.',
  );
}

async function validateDeclaredDirectory({
  repoRoot,
  canonicalRoot,
  directory,
  declaredPaths,
  visitedDirectories,
}) {
  const canonicalDirectory = await realpath(directory);
  if (visitedDirectories.has(canonicalDirectory)) {
    throw candidateSymlinkError(
      'Release candidate symlinks must not contain directory cycles.',
    );
  }
  visitedDirectories.add(canonicalDirectory);
  try {
    for (const entry of await readdir(canonicalDirectory, {
      withFileTypes: true,
    })) {
      const path = join(canonicalDirectory, entry.name);
      const stats = await lstat(path);
      if (stats.isFile()) {
        requireDeclaredTarget(canonicalRoot, path, declaredPaths);
      } else if (stats.isDirectory()) {
        await validateDeclaredDirectory({
          repoRoot,
          canonicalRoot,
          directory: path,
          declaredPaths,
          visitedDirectories,
        });
      } else if (stats.isSymbolicLink()) {
        requireDeclaredTarget(canonicalRoot, path, declaredPaths);
        await validateCandidateSymlink({
          repoRoot,
          canonicalRoot,
          linkPath: path,
          link: await readlink(path),
          declaredPaths,
          visitedDirectories,
        });
      } else {
        throw candidateSymlinkError(
          'Release candidate symlink targets contain an unsupported filesystem entry.',
        );
      }
    }
  } finally {
    visitedDirectories.delete(canonicalDirectory);
  }
}

function requireDeclaredTarget(canonicalRoot, target, declaredPaths) {
  const path = relative(canonicalRoot, target).split(sep).join('/');
  if (!declaredPaths.has(path)) {
    throw candidateSymlinkError(
      `Release candidate symlink target is not declared: ${path}.`,
    );
  }
}

async function rejectSymlinkAncestors(root, target) {
  const parts = relative(root, target).split(sep).slice(0, -1);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) {
      throw candidateSymlinkError(
        'Release candidate symlinks must not traverse symlinked directories.',
      );
    }
  }
}

function isContained(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function candidateSymlinkError(message) {
  return new RcBuildError('E_CANDIDATE_SYMLINK', message);
}

function findHashChanges(before, after) {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return sorted(paths).filter((path) => before.get(path) !== after.get(path));
}

async function hashTree(root) {
  const paths = await walkFiles(root);
  const entries = await Promise.all(
    paths.map(async (path) => ({
      path: relative(root, path).replaceAll('\\', '/'),
      sha256: await hashFile(path),
    })),
  );
  return hashBytes(Buffer.from(JSON.stringify(entries)));
}

async function walkFiles(root) {
  const files = [];
  for (const entry of sorted(
    await readdir(root, { withFileTypes: true }),
    (item) => item.name,
  )) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    } else {
      throw new RcBuildError(
        'E_ASSET_TYPE',
        `Unsupported bundled asset type: ${path}`,
      );
    }
  }
  return files;
}

async function hashFile(path) {
  return hashBytes(await readFile(path));
}

async function createStagingDirectory(outputRoot) {
  await mkdir(dirname(outputRoot), { recursive: true });
  return mkdtemp(join(dirname(outputRoot), `.${basename(outputRoot)}-`));
}

export async function validateRcOutputPath(repoRoot, outputRoot, recordPath) {
  const rawRoot = resolve(repoRoot);
  const rawOutput = resolve(outputRoot);
  const rawRecord = resolve(recordPath);
  let outputStats;
  try {
    outputStats = await lstat(rawOutput);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new RcBuildError(
        'E_OUTPUT_UNSAFE',
        'RC output could not be inspected safely.',
      );
    }
  }
  if (outputStats?.isSymbolicLink()) {
    throw new RcBuildError(
      'E_OUTPUT_UNSAFE',
      'RC output must not be a symlink.',
    );
  }

  const root = await canonicalProspectivePath(rawRoot);
  const output = await canonicalProspectivePath(rawOutput);
  const record = await canonicalProspectivePath(rawRecord);
  const filesystemRoot = parse(output).root;
  if (
    output === filesystemRoot ||
    output === root ||
    root.startsWith(`${output}${sep}`)
  ) {
    throw new RcBuildError(
      'E_OUTPUT_UNSAFE',
      'RC output must not be a filesystem root, repository root, or repository ancestor.',
    );
  }
  if (record === output || record.startsWith(`${output}${sep}`)) {
    throw new RcBuildError(
      'E_OUTPUT_UNSAFE',
      'RC identity record must be outside the retained artifact directory.',
    );
  }

  const sourcePaths = [
    ...new Set([
      ...PACKAGE_DIRECTORIES.values(),
      ...releaseCandidatePathspecGroups()
        .flat()
        .filter((path) => !path.startsWith(':(exclude)')),
    ]),
  ].map((path) => resolve(root, path));
  if (
    sourcePaths.some(
      (source) =>
        output === source ||
        output.startsWith(`${source}${sep}`) ||
        source.startsWith(`${output}${sep}`),
    )
  ) {
    throw new RcBuildError(
      'E_OUTPUT_UNSAFE',
      'RC output must not overlap a release candidate source.',
    );
  }

  if (!outputStats) return;
  if (!outputStats.isDirectory()) {
    throw new RcBuildError(
      'E_OUTPUT_UNSAFE',
      'RC output must not be a symlink or non-directory filesystem entry.',
    );
  }

  let marker;
  try {
    const markerPath = join(output, RC_OWNER_MARKER);
    const markerStats = await lstat(markerPath);
    if (!markerStats.isFile() || markerStats.isSymbolicLink()) {
      throw new Error('invalid marker');
    }
    marker = JSON.parse(await readFile(markerPath, 'utf8'));
  } catch {
    throw new RcBuildError(
      'E_OUTPUT_UNOWNED',
      'Existing RC output is not owned by the release candidate builder.',
    );
  }
  if (
    Object.keys(marker).length !== 1 ||
    marker.schemaVersion !== RC_OWNER.schemaVersion
  ) {
    throw new RcBuildError(
      'E_OUTPUT_UNOWNED',
      'Existing RC output has an invalid ownership marker.',
    );
  }
}

async function canonicalProspectivePath(path) {
  const missing = [];
  let candidate = path;
  while (true) {
    try {
      const canonical = await realpath(candidate);
      return resolve(canonical, ...missing.reverse());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(candidate);
      if (parent === candidate) throw error;
      missing.push(basename(candidate));
      candidate = parent;
    }
  }
}

async function replaceOwnedOutput(stagingRoot, outputRoot) {
  let existing = false;
  try {
    await lstat(outputRoot);
    existing = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!existing) {
    await rename(stagingRoot, outputRoot);
    return;
  }

  const previous = `${outputRoot}.previous-${process.pid}-${Date.now()}`;
  await rename(outputRoot, previous);
  try {
    await rename(stagingRoot, outputRoot);
  } catch (error) {
    await rename(previous, outputRoot);
    throw error;
  }
  await rm(previous, { recursive: true, force: true });
}

async function backupDirectory(source) {
  const root = await mkdtemp(join(tmpdir(), 'explainer-rc-assets-'));
  const backup = join(root, 'assets');
  try {
    await cp(source, backup, {
      recursive: true,
      preserveTimestamps: true,
    });
    return { root, backup, existed: true };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      await rm(root, { recursive: true, force: true });
      throw error;
    }
    return { root, backup, existed: false };
  }
}

async function restoreDirectory(destination, snapshot) {
  await rm(destination, { recursive: true, force: true });
  if (snapshot.existed) {
    await cp(snapshot.backup, destination, {
      recursive: true,
      preserveTimestamps: true,
    });
  }
  await rm(snapshot.root, { recursive: true, force: true });
}

async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporaryPath, path);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function parseSkillVersion(content, name) {
  const match = content.match(/^version:\s*(\S+)\s*$/m);
  if (!match) {
    throw new RcBuildError(
      'E_SKILL_VERSION',
      `Bundled ${name} has no frontmatter version.`,
    );
  }
  return match[1];
}

function requiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new RcBuildError('E_RC_METADATA', `Missing ${label}.`);
  }
  return value;
}

async function run(command, args, cwd) {
  try {
    const { stdout } = await execFileAsync(command, args, {
      cwd,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    const detail = String(error.stderr ?? error.message).trim();
    throw new RcBuildError(
      'E_RC_COMMAND',
      `${command} ${args.join(' ')} failed${detail ? `: ${detail}` : ''}`,
    );
  }
}

function sorted(values, selector = (value) => value) {
  return Array.from(values).sort((left, right) => {
    const leftValue = selector(left);
    const rightValue = selector(right);
    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  });
}

function byName(left, right) {
  return left.name < right.name ? -1 : left.name > right.name ? 1 : 0;
}

function byId(left, right) {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function byRecipeIdentity(left, right) {
  return byId(left, right) || left.version.localeCompare(right.version);
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--output' && argument !== '--record') {
      throw new RcBuildError('E_USAGE', `Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new RcBuildError('E_USAGE', `${argument} requires a path.`);
    }
    const key = argument.slice(2);
    if (options[key]) {
      throw new RcBuildError('E_USAGE', `${argument} may be supplied once.`);
    }
    options[key] = value;
    index += 1;
  }
  if (!options.output || !options.record) {
    throw new RcBuildError(
      'E_USAGE',
      'Usage: build-explainer-rc.mjs --output <dir> --record <json>',
    );
  }
  return options;
}

async function main() {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await buildExplainerRc(options);
    process.stdout.write(`${JSON.stringify({ rcId: result.rcId })}\n`);
  } catch (error) {
    const payload = {
      code: error.code ?? 'E_RC_BUILD',
      message: error.message,
      ...(error.changedCandidates
        ? { changedCandidates: error.changedCandidates }
        : {}),
    };
    process.stderr.write(`${JSON.stringify(payload)}\n`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await main();
}
