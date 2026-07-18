#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const PACKAGE_DIRECTORIES = new Map([
  ['@open-agent-toolkit/cli', 'packages/cli'],
  ['@open-agent-toolkit/control-plane', 'packages/control-plane'],
  ['@open-agent-toolkit/docs-config', 'packages/docs-config'],
  ['@open-agent-toolkit/docs-theme', 'packages/docs-theme'],
  ['@open-agent-toolkit/docs-transforms', 'packages/docs-transforms'],
]);
const SKILL_NAMES = ['explainer-kit', 'oat-explainer-kit'];
const CANDIDATE_ROOTS = [
  ...PACKAGE_DIRECTORIES.values(),
  ...SKILL_NAMES.map((name) => `.agents/skills/${name}`),
];
const CANDIDATE_PATHSPECS = [
  ...CANDIDATE_ROOTS,
  ':(exclude)packages/cli/assets',
  ':(exclude)packages/*/dist',
  ':(exclude)packages/*/tsconfig.tsbuildinfo',
];

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
        schemaVersion: 'explainer-kit.release-candidate/v1',
        commit,
        packages,
        skills: skills.sort(byName),
        schemas,
        recipes,
        changedCandidates: [],
      };
      const rcId = hashBytes(Buffer.from(JSON.stringify(identity)));
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

      await rm(outputRoot, { recursive: true, force: true });
      await mkdir(dirname(outputRoot), { recursive: true });
      await rename(stagingRoot, outputRoot);
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
  return entries.sort(byId);
}

async function listChangedCandidates(repoRoot) {
  const output = await run(
    'git',
    [
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
      '--',
      ...CANDIDATE_PATHSPECS,
    ],
    repoRoot,
  );
  const tokens = output.split('\0').filter(Boolean);
  const paths = [];
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
  return sorted(new Set(paths));
}

async function snapshotTrackedCandidates(repoRoot) {
  const output = await run(
    'git',
    ['ls-files', '-z', '--', ...CANDIDATE_PATHSPECS],
    repoRoot,
  );
  const paths = sorted(output.split('\0').filter(Boolean));
  const entries = await Promise.all(
    paths.map(async (path) => [path, await hashFile(join(repoRoot, path))]),
  );
  return new Map(entries);
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

function hashBytes(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function createStagingDirectory(outputRoot) {
  await mkdir(dirname(outputRoot), { recursive: true });
  return mkdtemp(join(dirname(outputRoot), `.${basename(outputRoot)}-`));
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
